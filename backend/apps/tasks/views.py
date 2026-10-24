from django.db import transaction
from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.employees.models import Employee

from .models import Task, TaskAttachment, TaskComment
from .serializers import (
    TaskCommentSerializer,
    TaskDetailSerializer,
    TaskSerializer,
    TaskTransitionRequestSerializer,
    TaskUpdateSerializer,
    TaskWriteSerializer,
)
from .transitions import ACTION_CONFIG, apply_task_transition


class TaskViewSet(viewsets.ModelViewSet):
    queryset = (
        Task.objects.all()
        .select_related(
            "project", "department", "team", "assignee", "reporter", "reviewer", "parent"
        )
        .prefetch_related("attachments")
    )
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["status", "priority", "project_id", "department_id"]
    search_fields = ["key", "title", "description"]
    ordering_fields = ["key", "created_at", "due_date", "priority", "status"]

    def get_queryset(self):
        qs = super().get_queryset()
        scope = self.request.query_params.get("scope")
        review = self.request.query_params.get("review")
        assignee_id = self.request.query_params.get("assignee")
        emp = getattr(self.request.user, "employee_profile", None)

        if scope == "mine" and emp:
            qs = qs.filter(assignee=emp)
        elif assignee_id:
            qs = qs.filter(assignee_id=assignee_id)

        if review in ("1", "true") and emp:
            qs = qs.filter(reviewer=emp, status="in_review")

        return qs

    def get_serializer_class(self):
        if self.action == "create":
            return TaskWriteSerializer
        if self.action in ("update", "partial_update"):
            return TaskUpdateSerializer
        if self.action == "retrieve":
            return TaskDetailSerializer
        return TaskSerializer

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = TaskWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        project = data["project"]
        emp = getattr(request.user, "employee_profile", None)
        if not emp:
            # Create a fallback employee profile if needed for test users
            emp, _ = Employee.objects.get_or_create(
                user=request.user,
                defaults={
                    "employee_code": f"EMP-{request.user.id.hex[:6].upper()}",
                    "first_name": request.user.first_name or "Staff",
                    "last_name": request.user.last_name or "Member",
                    "email": request.user.email,
                    "job_title": "Employee",
                    "department": project.department,
                },
            )

        task_count = Task.objects.filter(project=project).count() + 1
        key = f"{project.key}-{task_count}"

        task = Task.objects.create(
            key=key,
            title=data["title"],
            description=data.get("description", ""),
            project=project,
            department=project.department,
            team=data.get("team") or getattr(emp, "team", None),
            assignee=data["assignee"],
            reporter=emp,
            reviewer=data.get("reviewer"),
            priority=data.get("priority", "medium"),
            status=data.get("status", "todo"),
            start_date=data.get("start_date"),
            due_date=data.get("due_date"),
            labels=data.get("labels", []),
            parent=data.get("parent"),
        )

        output_serializer = TaskDetailSerializer(task, context={"request": request})
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def transitions(self, request, pk=None):
        """Submit a state machine transition action."""
        task = self.get_object()
        serializer = TaskTransitionRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        action_name = serializer.validated_data["action"]
        comment = serializer.validated_data.get("comment", "") or serializer.validated_data.get(
            "reason", ""
        )
        actor = getattr(request.user, "employee_profile", None)

        updated_task = apply_task_transition(
            task=task,
            action=action_name,
            comment=comment,
            actor=actor,
        )

        output_serializer = TaskDetailSerializer(updated_task, context={"request": request})
        return Response(output_serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get", "post"])
    def comments(self, request, pk=None):
        """List or add comments to a task."""
        task = self.get_object()

        if request.method == "GET":
            comments = task.comments.all().select_related("author")
            serializer = TaskCommentSerializer(comments, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

        body = request.data.get("body", "").strip()
        if not body:
            return Response(
                {"body": ["Comment body cannot be blank."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        author = getattr(request.user, "employee_profile", None)
        comment = TaskComment.objects.create(task=task, author=author, body=body)
        serializer = TaskCommentSerializer(comment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def attachments(self, request, pk=None):
        """Attach files to a task."""
        task = self.get_object()
        file_obj = request.FILES.get("file")
        if not file_obj:
            return Response({"file": ["File is required."]}, status=status.HTTP_400_BAD_REQUEST)

        att = TaskAttachment.objects.create(
            task=task,
            name=file_obj.name,
            size=file_obj.size,
            content_type=getattr(file_obj, "content_type", "application/octet-stream"),
            url=f"/media/attachments/{file_obj.name}",
        )
        return Response(
            {
                "id": str(att.id),
                "name": att.name,
                "size": att.size,
                "content_type": att.content_type,
                "url": att.url,
            },
            status=status.HTTP_201_CREATED,
        )


class WorkflowDefinitionView(APIView):
    """Provides workflow statuses and supported transition definitions."""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses={200: dict})
    def get(self, request):
        statuses = [
            {"id": "backlog", "label": "Backlog", "description": "Unscheduled backlog items."},
            {"id": "todo", "label": "To Do", "description": "Ready for assignment or work."},
            {"id": "in_progress", "label": "In Progress", "description": "Active development."},
            {"id": "in_review", "label": "In Review", "description": "Awaiting peer/lead review."},
            {
                "id": "changes_requested",
                "label": "Changes Requested",
                "description": "Feedback received, requires changes.",
            },
            {"id": "done", "label": "Done", "description": "Completed and accepted."},
            {"id": "blocked", "label": "Blocked", "description": "Impediment preventing progress."},
        ]

        actions = [
            {
                "action": k,
                "label": v["label"],
                "to": v.get("to"),
                "requires_comment": v["requires_comment"],
            }
            for k, v in ACTION_CONFIG.items()
        ]

        return Response(
            {
                "statuses": statuses,
                "actions": actions,
                "note": "Workforce Hub standard task workflow engine.",
            },
            status=status.HTTP_200_OK,
        )
