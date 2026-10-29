from datetime import timedelta

from django.db.models import Count
from django.utils import timezone
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.attendance.models import AttendanceRecord
from apps.attendance.views import get_or_create_employee_for_user
from apps.employees.models import Employee
from apps.employees.serializers import EmployeeSerializer
from apps.leave_management.models import LeaveBalance, LeaveRequest
from apps.leave_management.serializers import LeaveBalanceSerializer, LeaveRequestSerializer
from apps.leave_management.views import ensure_default_leave_balances
from apps.notifications.models import Notification
from apps.notifications.serializers import NotificationSerializer
from apps.organisations.models import OrganisationSettings, Project
from apps.organisations.serializers import ProjectSerializer
from apps.tasks.models import Task, TaskEvent
from apps.tasks.serializers import TaskSerializer


class DashboardReportView(APIView):
    """
    Role-aware dashboard API providing aggregated metrics, deadlines,
    attendance, workload, and notifications matching frontend DashboardResponse.
    """

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses={200: OpenApiTypes.OBJECT})
    def get(self, request):
        user = request.user
        emp = get_or_create_employee_for_user(user)
        is_hr = user.role in ("super_admin", "hr_admin") or user.is_superuser
        is_manager = user.role == "manager"
        today = timezone.now().date()
        range_from = (today - timedelta(days=30)).isoformat()
        range_to = today.isoformat()

        scope = "organisation" if is_hr else ("team" if is_manager else "self")

        # Metrics
        open_tasks_count = Task.objects.filter(assignee=emp).exclude(status__in=["done"]).count()
        overdue_tasks_count = (
            Task.objects.filter(assignee=emp, due_date__lt=today)
            .exclude(status__in=["done"])
            .count()
        )

        ensure_default_leave_balances(emp)
        annual_balance = LeaveBalance.objects.filter(
            employee=emp, leave_type__code="annual"
        ).first()
        available_leave = annual_balance.available_days if annual_balance else 0.0

        metrics = [
            {
                "id": "open_tasks",
                "label": "My Open Tasks",
                "value": str(open_tasks_count),
                "tone": "info",
                "href": "/tasks?scope=mine",
            },
            {
                "id": "overdue_tasks",
                "label": "Overdue Tasks",
                "value": str(overdue_tasks_count),
                "tone": "danger" if overdue_tasks_count > 0 else "default",
                "href": "/tasks?scope=mine",
            },
            {
                "id": "leave_balance",
                "label": "Annual Leave Remaining",
                "value": f"{available_leave:.1f} days",
                "tone": "success",
                "href": "/leave",
            },
        ]

        if is_hr:
            active_count = Employee.objects.filter(status="active").count()
            metrics.append(
                {
                    "id": "active_headcount",
                    "label": "Active Workforce",
                    "value": str(active_count),
                    "tone": "default",
                    "href": "/employees",
                }
            )

        # Attendance today is always returned so the clock-in control is visible
        # before the first punch of the day.
        org = OrganisationSettings.objects.first()
        breaks_enabled = org.breaks_enabled if org else True
        standard_start = org.standard_start if org else "09:00"
        att_rec = AttendanceRecord.objects.filter(employee=emp, date=today).first()
        if not att_rec or not att_rec.clock_in_at:
            attendance_today = {
                "date": today.isoformat(),
                "status": "not_started",
                "clock_in_at": None,
                "clock_out_at": None,
                "break_started_at": None,
                "break_minutes": 0,
                "worked_minutes": 0,
                "timezone": getattr(user, "timezone", "UTC"),
                "is_late": False,
                "missing_clock_out": False,
                "breaks_enabled": breaks_enabled,
                "standard_start": standard_start,
            }
        else:
            if att_rec.clock_out_at:
                day_status = "clocked_out"
                worked = att_rec.worked_minutes
            elif att_rec.break_started_at:
                day_status = "on_break"
                elapsed = int((timezone.now() - att_rec.clock_in_at).total_seconds() / 60)
                worked = max(0, elapsed - att_rec.break_minutes)
            else:
                day_status = "clocked_in"
                elapsed = int((timezone.now() - att_rec.clock_in_at).total_seconds() / 60)
                worked = max(0, elapsed - att_rec.break_minutes)
            attendance_today = {
                "date": att_rec.date.isoformat(),
                "status": day_status,
                "clock_in_at": att_rec.clock_in_at.isoformat(),
                "clock_out_at": att_rec.clock_out_at.isoformat() if att_rec.clock_out_at else None,
                "break_started_at": att_rec.break_started_at.isoformat()
                if att_rec.break_started_at
                else None,
                "break_minutes": att_rec.break_minutes,
                "worked_minutes": worked,
                "timezone": att_rec.timezone,
                "is_late": "late" in att_rec.exceptions,
                "missing_clock_out": False,
                "breaks_enabled": breaks_enabled,
                "standard_start": standard_start,
            }

        # Tasks breakdown
        task_summary_raw = (
            Task.objects.filter(assignee=emp).values("status").annotate(count=Count("id"))
        )
        task_summary = [
            {"status": item["status"], "count": item["count"]} for item in task_summary_raw
        ]

        upcoming_deadlines_qs = (
            Task.objects.filter(assignee=emp, due_date__gte=today)
            .exclude(status="done")
            .order_by("due_date")[:5]
        )
        upcoming_deadlines = TaskSerializer(upcoming_deadlines_qs, many=True).data

        overdue_qs = (
            Task.objects.filter(assignee=emp, due_date__lt=today)
            .exclude(status="done")
            .order_by("due_date")[:5]
        )
        overdue_tasks = TaskSerializer(overdue_qs, many=True).data

        # Leave balances
        leave_balances_qs = LeaveBalance.objects.filter(employee=emp).select_related("leave_type")
        leave_balances = LeaveBalanceSerializer(leave_balances_qs, many=True).data

        # Pending leave requests
        pending_requests_qs = LeaveRequest.objects.filter(employee=emp, status="pending")
        pending_requests = LeaveRequestSerializer(pending_requests_qs, many=True).data

        # Notifications
        notifs_qs = Notification.objects.filter(recipient=user).order_by("-created_at")[:10]
        notifications = NotificationSerializer(notifs_qs, many=True).data

        # Recent activity
        events_qs = (
            TaskEvent.objects.all().select_related("actor", "task").order_by("-created_at")[:10]
        )
        activity = [
            {
                "id": str(evt.id),
                "actor_name": evt.actor.display_name,
                "message": evt.message,
                "created_at": evt.created_at.isoformat(),
                "href": f"/tasks/{evt.task.id}",
            }
            for evt in events_qs
        ]

        # Organisation block (only for HR / SuperAdmin)
        organisation = None
        if is_hr:
            dept_counts = (
                Employee.objects.filter(status="active")
                .values("department__id", "department__name")
                .annotate(count=Count("id"))
            )
            total_emp = Employee.objects.count()
            act_emp = Employee.objects.filter(status="active").count()
            organisation = {
                "total_employees": total_emp,
                "active_employees": act_emp,
                "departments": [
                    {
                        "id": str(d["department__id"]),
                        "name": d["department__name"] or "General",
                        "count": d["count"],
                    }
                    for d in dept_counts
                ],
                "attendance_summary": {
                    "present": AttendanceRecord.objects.filter(
                        date=today, status="present"
                    ).count(),
                    "late": AttendanceRecord.objects.filter(date=today, status="late").count(),
                    "absent": AttendanceRecord.objects.filter(date=today, status="absent").count(),
                    "on_leave": AttendanceRecord.objects.filter(date=today, status="leave").count(),
                },
                "pending_leave": LeaveRequest.objects.filter(status="pending").count(),
                "pending_hr": 0,
                "joiners": [],
                "exits": [],
                "audit": [],
            }

        response_data = {
            "generated_at": timezone.now().isoformat(),
            "scope": scope,
            "range": {"from": range_from, "to": range_to},
            "filters": {"department_id": None},
            "greeting_name": user.first_name or "Colleague",
            "metrics": metrics,
            "attendance_today": attendance_today,
            "task_summary": task_summary,
            "upcoming_deadlines": upcoming_deadlines,
            "overdue_tasks": overdue_tasks,
            "leave_balances": leave_balances,
            "pending_requests": pending_requests,
            "notifications": notifications,
            "activity": activity,
            "team": None,
            "organisation": organisation,
        }

        return Response(response_data, status=status.HTTP_200_OK)


class TaskReportView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses={200: OpenApiTypes.OBJECT})
    def get(self, request):
        today = timezone.now().date()
        range_from = (today - timedelta(days=30)).isoformat()
        range_to = today.isoformat()

        by_status_raw = Task.objects.values("status").annotate(count=Count("id"))
        by_priority_raw = Task.objects.values("priority").annotate(count=Count("id"))

        overdue_qs = Task.objects.filter(due_date__lt=today).exclude(status="done")[:10]

        return Response(
            {
                "range": {"from": range_from, "to": range_to},
                "department_id": None,
                "by_status": [
                    {"status": item["status"], "count": item["count"]} for item in by_status_raw
                ],
                "by_priority": [
                    {"priority": item["priority"], "count": item["count"]}
                    for item in by_priority_raw
                ],
                "overdue": TaskSerializer(overdue_qs, many=True).data,
                "workload": [],
                "completed_in_range": Task.objects.filter(status="done").count(),
                "open_tasks": Task.objects.exclude(status="done").count(),
            },
            status=status.HTTP_200_OK,
        )


class AttendanceReportView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses={200: OpenApiTypes.OBJECT})
    def get(self, request):
        today = timezone.now().date()
        range_from = (today - timedelta(days=30)).isoformat()
        range_to = today.isoformat()

        present_cnt = AttendanceRecord.objects.filter(status="present").count()
        late_cnt = AttendanceRecord.objects.filter(status="late").count()
        absent_cnt = AttendanceRecord.objects.filter(status="absent").count()

        return Response(
            {
                "range": {"from": range_from, "to": range_to},
                "department_id": None,
                "summary": {
                    "present": present_cnt,
                    "late": late_cnt,
                    "absent": absent_cnt,
                    "partial": 0,
                },
                "by_day": [],
                "exceptions": [],
            },
            status=status.HTTP_200_OK,
        )


class LeaveReportView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses={200: OpenApiTypes.OBJECT})
    def get(self, request):
        today = timezone.now().date()
        range_from = (today - timedelta(days=30)).isoformat()
        range_to = today.isoformat()

        reqs = LeaveRequest.objects.all().order_by("-created_at")[:20]
        return Response(
            {
                "range": {"from": range_from, "to": range_to},
                "department_id": None,
                "by_type": [],
                "requests": LeaveRequestSerializer(reqs, many=True).data,
            },
            status=status.HTTP_200_OK,
        )


class HeadcountReportView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses={200: OpenApiTypes.OBJECT})
    def get(self, request):
        today = timezone.now().date()
        range_from = (today - timedelta(days=30)).isoformat()
        range_to = today.isoformat()

        total = Employee.objects.count()
        active = Employee.objects.filter(status="active").count()

        dept_counts = Employee.objects.values("department__name").annotate(count=Count("id"))
        type_counts = Employee.objects.values("employment_type").annotate(count=Count("id"))

        return Response(
            {
                "range": {"from": range_from, "to": range_to},
                "department_id": None,
                "total": total,
                "active": active,
                "by_department": [
                    {"name": d["department__name"] or "General", "count": d["count"]}
                    for d in dept_counts
                ],
                "by_type": [
                    {"employment_type": t["employment_type"], "count": t["count"]}
                    for t in type_counts
                ],
                "joiners": [],
                "exits": [],
            },
            status=status.HTTP_200_OK,
        )


class GlobalSearchView(APIView):
    """Global search across tasks, employees, and projects."""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses={200: OpenApiTypes.OBJECT})
    def get(self, request):
        query = request.query_params.get("q", "").strip()
        if not query:
            return Response(
                {"tasks": [], "employees": [], "projects": []}, status=status.HTTP_200_OK
            )

        tasks_qs = Task.objects.filter(title__icontains=query)[:10]
        employees_qs = Employee.objects.filter(first_name__icontains=query)[:10]
        projects_qs = Project.objects.filter(name__icontains=query)[:10]

        return Response(
            {
                "tasks": TaskSerializer(tasks_qs, many=True).data,
                "employees": EmployeeSerializer(
                    employees_qs, many=True, context={"request": request}
                ).data,
                "projects": ProjectSerializer(projects_qs, many=True).data,
            },
            status=status.HTTP_200_OK,
        )
