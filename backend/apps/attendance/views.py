from datetime import datetime

from django.db import transaction
from django.utils import timezone
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import permissions, serializers, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.approvals.models import Approval
from apps.employees.models import Employee
from apps.organisations.models import OrganisationSettings

from .models import AttendanceCorrection, AttendanceRecord
from .serializers import (
    AttendanceCorrectionSerializer,
    AttendanceCorrectionWriteSerializer,
    AttendanceRecordSerializer,
    AttendanceTodaySerializer,
)


def department_for_employee(employee):
    """Attendance records require a department. Use the employee's, or the first one."""
    if employee.department_id:
        return employee.department
    from apps.organisations.models import Department

    department = Department.objects.order_by("name").first()
    if department is None:
        return None
    employee.department = department
    employee.save(update_fields=["department", "updated_at"])
    return department


def get_or_create_employee_for_user(user):
    emp = getattr(user, "employee_profile", None)
    if not emp:
        emp, _ = Employee.objects.get_or_create(
            user=user,
            defaults={
                "employee_code": f"EMP-{user.id.hex[:6].upper()}",
                "first_name": user.first_name or "Staff",
                "last_name": user.last_name or "Member",
                "email": user.email,
                "job_title": "Staff",
            },
        )
    return emp


class AttendanceMeView(APIView):
    """Retrieve today's attendance state for the current user."""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses={200: AttendanceTodaySerializer})
    def get(self, request):
        emp = get_or_create_employee_for_user(request.user)
        today = timezone.now().date()
        record = AttendanceRecord.objects.filter(employee=emp, date=today).first()
        org = OrganisationSettings.objects.first()

        breaks_enabled = org.breaks_enabled if org else True
        standard_start = org.standard_start if org else "09:00"

        if not record:
            state = {
                "date": today,
                "status": "not_started",
                "clock_in_at": None,
                "clock_out_at": None,
                "break_started_at": None,
                "break_minutes": 0,
                "worked_minutes": 0,
                "timezone": getattr(request.user, "timezone", "UTC"),
                "is_late": False,
                "missing_clock_out": False,
                "breaks_enabled": breaks_enabled,
                "standard_start": standard_start,
            }
        else:
            if record.clock_out_at:
                day_status = "clocked_out"
            elif record.break_started_at:
                day_status = "on_break"
            else:
                day_status = "clocked_in"

            # Compute current worked minutes if clocked in
            worked = record.worked_minutes
            if record.clock_in_at and not record.clock_out_at:
                elapsed = int((timezone.now() - record.clock_in_at).total_seconds() / 60)
                worked = max(0, elapsed - record.break_minutes)

            state = {
                "date": record.date,
                "status": day_status,
                "clock_in_at": record.clock_in_at,
                "clock_out_at": record.clock_out_at,
                "break_started_at": record.break_started_at,
                "break_minutes": record.break_minutes,
                "worked_minutes": worked,
                "timezone": record.timezone,
                "is_late": "late" in record.exceptions,
                "missing_clock_out": False,
                "breaks_enabled": breaks_enabled,
                "standard_start": standard_start,
            }

        serializer = AttendanceTodaySerializer(state)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ClockInView(APIView):
    """Authoritative server-side clock in."""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        request=None,
        responses={
            200: inline_serializer(
                name="ClockInResponse",
                fields={
                    "detail": serializers.CharField(),
                    "clock_in_at": serializers.DateTimeField(),
                },
            )
        },
    )
    @transaction.atomic
    def post(self, request):
        emp = get_or_create_employee_for_user(request.user)
        department = department_for_employee(emp)
        if department is None:
            return Response(
                {"detail": "Clock-in needs a department. Ask an administrator to add one first."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        today = timezone.now().date()
        record, created = AttendanceRecord.objects.get_or_create(
            employee=emp,
            date=today,
            defaults={
                "department": department,
                "timezone": getattr(request.user, "timezone", "UTC"),
            },
        )

        if not created and record.clock_in_at:
            return Response(
                {"detail": "You have already clocked in for today."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        now = timezone.now()
        record.clock_in_at = now
        # Check standard start for late marking
        org = OrganisationSettings.objects.first()
        if org and org.standard_start:
            std_hour, std_min = map(int, org.standard_start.split(":"))
            if now.hour > std_hour or (now.hour == std_hour and now.minute > std_min):
                if "late" not in record.exceptions:
                    record.exceptions.append("late")
                    record.status = "late"

        record.save()
        return Response(
            {"detail": "Clocked in successfully.", "clock_in_at": now}, status=status.HTTP_200_OK
        )


class ClockOutView(APIView):
    """Authoritative server-side clock out."""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        request=None,
        responses={
            200: inline_serializer(
                name="ClockOutResponse",
                fields={
                    "detail": serializers.CharField(),
                    "clock_out_at": serializers.DateTimeField(),
                    "worked_minutes": serializers.IntegerField(),
                },
            )
        },
    )
    @transaction.atomic
    def post(self, request):
        emp = get_or_create_employee_for_user(request.user)
        today = timezone.now().date()
        record = AttendanceRecord.objects.filter(employee=emp, date=today).first()

        if not record or not record.clock_in_at:
            return Response(
                {"detail": "Cannot clock out without clocking in first."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if record.clock_out_at:
            return Response(
                {"detail": "You have already clocked out for today."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        now = timezone.now()
        # End any open break
        if record.break_started_at:
            break_delta = int((now - record.break_started_at).total_seconds() / 60)
            record.break_minutes += break_delta
            record.break_started_at = None

        record.clock_out_at = now
        total_minutes = int((now - record.clock_in_at).total_seconds() / 60)
        record.worked_minutes = max(0, total_minutes - record.break_minutes)
        record.save()

        return Response(
            {
                "detail": "Clocked out successfully.",
                "clock_out_at": now,
                "worked_minutes": record.worked_minutes,
            },
            status=status.HTTP_200_OK,
        )


class BreakStartView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        request=None,
        responses={
            200: inline_serializer(
                name="BreakStartResponse",
                fields={"detail": serializers.CharField()},
            )
        },
    )
    def post(self, request):
        emp = get_or_create_employee_for_user(request.user)
        today = timezone.now().date()
        record = AttendanceRecord.objects.filter(employee=emp, date=today).first()
        if not record or not record.clock_in_at or record.clock_out_at:
            return Response({"detail": "Cannot start a break."}, status=status.HTTP_400_BAD_REQUEST)

        if record.break_started_at:
            return Response(
                {"detail": "A break is already active."}, status=status.HTTP_400_BAD_REQUEST
            )

        record.break_started_at = timezone.now()
        record.save(update_fields=["break_started_at", "updated_at"])
        return Response({"detail": "Break started."}, status=status.HTTP_200_OK)


class BreakEndView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        request=None,
        responses={
            200: inline_serializer(
                name="BreakEndResponse",
                fields={
                    "detail": serializers.CharField(),
                    "break_minutes": serializers.IntegerField(),
                },
            )
        },
    )
    def post(self, request):
        emp = get_or_create_employee_for_user(request.user)
        today = timezone.now().date()
        record = AttendanceRecord.objects.filter(employee=emp, date=today).first()
        if not record or not record.break_started_at:
            return Response(
                {"detail": "No active break to end."}, status=status.HTTP_400_BAD_REQUEST
            )

        now = timezone.now()
        delta = int((now - record.break_started_at).total_seconds() / 60)
        record.break_minutes += delta
        record.break_started_at = None
        record.save(update_fields=["break_minutes", "break_started_at", "updated_at"])
        return Response(
            {"detail": "Break ended.", "break_minutes": record.break_minutes},
            status=status.HTTP_200_OK,
        )


class AttendanceRecordViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AttendanceRecord.objects.all().select_related("employee", "department")
    serializer_class = AttendanceRecordSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["status", "department_id"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        emp = getattr(user, "employee_profile", None)
        is_hr = user.role in ("super_admin", "hr_admin") or user.is_superuser
        is_manager = user.role == "manager"

        employee_id = self.request.query_params.get("employee")
        date_from = self.request.query_params.get("from")
        date_to = self.request.query_params.get("to")
        exception = self.request.query_params.get("exception")

        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        elif not is_hr and not is_manager and emp:
            # Standard employees view their own records only
            qs = qs.filter(employee=emp)

        if date_from:
            qs = qs.filter(date__gte=datetime.strptime(date_from, "%Y-%m-%d").date())
        if date_to:
            qs = qs.filter(date__lte=datetime.strptime(date_to, "%Y-%m-%d").date())
        if exception in ("1", "true"):
            qs = qs.exclude(status="present")

        return qs


class AttendanceCorrectionViewSet(viewsets.ModelViewSet):
    queryset = AttendanceCorrection.objects.all().select_related("employee", "decided_by")
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "create":
            return AttendanceCorrectionWriteSerializer
        return AttendanceCorrectionSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        emp = getattr(user, "employee_profile", None)
        is_hr = user.role in ("super_admin", "hr_admin") or user.is_superuser
        if not is_hr and emp:
            qs = qs.filter(employee=emp)
        return qs

    @transaction.atomic
    def perform_create(self, serializer):
        emp = get_or_create_employee_for_user(self.request.user)
        instance = serializer.save(employee=emp)
        Approval.objects.create(
            type="attendance_correction",
            subject_id=instance.id,
            employee=emp,
            approver=emp.manager,
            title=f"Attendance Correction: {emp.display_name} ({instance.date})",
            summary=f"Requested punch correction on {instance.date}: {instance.reason}",
            status="pending",
        )
