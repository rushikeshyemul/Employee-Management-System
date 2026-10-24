from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.employees.models import Employee
from apps.organisations.models import Project

from .models import Task, TaskAttachment, TaskComment, TaskEvent
from .transitions import get_available_actions


class PersonRefSerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()
    job_title = serializers.CharField(allow_null=True)
    avatar_url = serializers.CharField(allow_null=True)


class ProjectRefSerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()
    key = serializers.CharField()


def serialize_person_ref(employee: Employee | None):
    if not employee:
        return None
    return {
        "id": str(employee.id),
        "name": employee.display_name,
        "job_title": employee.job_title,
        "avatar_url": employee.avatar_url,
    }


class TaskAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskAttachment
        fields = ["id", "name", "size", "content_type", "url"]


class TaskCommentSerializer(serializers.ModelSerializer):
    task_id = serializers.CharField(source="task.id", read_only=True)
    author_id = serializers.CharField(source="author.id", read_only=True)
    author = serializers.SerializerMethodField()

    class Meta:
        model = TaskComment
        fields = ["id", "task_id", "author_id", "author", "body", "created_at"]
        read_only_fields = ["id", "task_id", "author_id", "author", "created_at"]

    @extend_schema_field(PersonRefSerializer)
    def get_author(self, obj):
        return serialize_person_ref(obj.author)


class TaskEventSerializer(serializers.ModelSerializer):
    task_id = serializers.CharField(source="task.id", read_only=True)
    actor_id = serializers.CharField(source="actor.id", read_only=True)
    actor = serializers.SerializerMethodField()

    class Meta:
        model = TaskEvent
        fields = ["id", "task_id", "actor_id", "actor", "message", "created_at"]

    @extend_schema_field(PersonRefSerializer)
    def get_actor(self, obj):
        return serialize_person_ref(obj.actor)


class TaskSerializer(serializers.ModelSerializer):
    project_id = serializers.CharField(source="project.id", read_only=True)
    department_id = serializers.CharField(source="department.id", read_only=True)
    team_id = serializers.CharField(source="team.id", allow_null=True, read_only=True)
    assignee_id = serializers.CharField(source="assignee.id", allow_null=True, read_only=True)
    reporter_id = serializers.CharField(source="reporter.id", read_only=True)
    reviewer_id = serializers.CharField(source="reviewer.id", allow_null=True, read_only=True)
    parent_id = serializers.CharField(source="parent.id", allow_null=True, read_only=True)

    project = serializers.SerializerMethodField()
    assignee = serializers.SerializerMethodField()
    reporter = serializers.SerializerMethodField()
    reviewer = serializers.SerializerMethodField()
    attachments = TaskAttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = Task
        fields = [
            "id",
            "key",
            "title",
            "description",
            "project_id",
            "project",
            "department_id",
            "team_id",
            "assignee_id",
            "assignee",
            "reporter_id",
            "reporter",
            "reviewer_id",
            "reviewer",
            "priority",
            "status",
            "assignment_state",
            "rejection_reason",
            "clarification_note",
            "block_reason",
            "blocked_from",
            "start_date",
            "due_date",
            "labels",
            "parent_id",
            "attachments",
            "created_at",
            "updated_at",
        ]

    @extend_schema_field(ProjectRefSerializer)
    def get_project(self, obj):
        return {
            "id": str(obj.project.id),
            "name": obj.project.name,
            "key": obj.project.key,
        }

    @extend_schema_field(PersonRefSerializer)
    def get_assignee(self, obj):
        return serialize_person_ref(obj.assignee)

    @extend_schema_field(PersonRefSerializer)
    def get_reporter(self, obj):
        return serialize_person_ref(obj.reporter)

    @extend_schema_field(PersonRefSerializer)
    def get_reviewer(self, obj):
        return serialize_person_ref(obj.reviewer)


class TaskDetailSerializer(TaskSerializer):
    comments = TaskCommentSerializer(many=True, read_only=True)
    events = TaskEventSerializer(many=True, read_only=True)
    subtasks = TaskSerializer(many=True, read_only=True)
    available_actions = serializers.SerializerMethodField()

    class Meta(TaskSerializer.Meta):
        fields = TaskSerializer.Meta.fields + [
            "comments",
            "events",
            "subtasks",
            "available_actions",
        ]

    @extend_schema_field(serializers.ListField(child=serializers.CharField()))
    def get_available_actions(self, obj):
        actor = (
            self.context.get("request").user.employee_profile
            if hasattr(self.context.get("request", None), "user")
            else None
        )
        return get_available_actions(obj, actor)


class TaskWriteSerializer(serializers.ModelSerializer):
    project_id = serializers.PrimaryKeyRelatedField(
        queryset=Project.objects.all(), source="project"
    )
    assignee_id = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(), source="assignee"
    )
    reviewer_id = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(), source="reviewer", allow_null=True, required=False
    )
    parent_id = serializers.PrimaryKeyRelatedField(
        queryset=Task.objects.all(), source="parent", allow_null=True, required=False
    )
    status = serializers.ChoiceField(
        choices=[("backlog", "Backlog"), ("todo", "To Do")], required=False, default="todo"
    )

    class Meta:
        model = Task
        fields = [
            "title",
            "description",
            "project_id",
            "assignee_id",
            "reviewer_id",
            "priority",
            "start_date",
            "due_date",
            "labels",
            "parent_id",
            "status",
        ]


class TaskUpdateSerializer(serializers.ModelSerializer):
    assignee_id = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(), source="assignee", allow_null=True, required=False
    )
    reviewer_id = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(), source="reviewer", allow_null=True, required=False
    )
    parent_id = serializers.PrimaryKeyRelatedField(
        queryset=Task.objects.all(), source="parent", allow_null=True, required=False
    )

    class Meta:
        model = Task
        fields = [
            "title",
            "description",
            "assignee_id",
            "reviewer_id",
            "priority",
            "start_date",
            "due_date",
            "labels",
            "parent_id",
        ]


class TaskTransitionRequestSerializer(serializers.Serializer):
    action = serializers.CharField()
    comment = serializers.CharField(required=False, allow_blank=True, default="")
    reason = serializers.CharField(required=False, allow_blank=True, default="")
