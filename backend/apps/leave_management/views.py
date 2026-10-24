from django.db import transaction
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.attendance.views import get_or_create_employee_for_user
from apps.employees.models import Employee

from .models import LeaveBalance, LeaveRequest, LeaveType
from .serializers import (
    LeaveBalanceSerializer,
    LeaveRequestSerializer,
    LeaveRequestWriteSerializer,
    LeaveTypeSerializer,
)


def ensure_default_leave_balances(employee: Employee):
    """Ensures employee has balances initialized for all active leave types."""
    types = LeaveType.objects.all()
    if not types.exists():
        LeaveType.objects.create(
            code="annual", name="Annual Leave", description="Standard paid vacation leave."
        )
        LeaveType.objects.create(
            code="sick", name="Sick Leave", description="Medical and emergency health leave."
        )
        LeaveType.objects.create(
            code="casual", name="Casual Leave", description="Short personal absence."
        )
        types = LeaveType.objects.all()

    for lt in types:
        allocated = 20.0 if lt.code == "annual" else (10.0 if lt.code == "sick" else 5.0)
        LeaveBalance.objects.get_or_create(
            employee=employee,
            leave_type=lt,
            defaults={"allocated_days": allocated, "used_days": 0.0, "pending_days": 0.0},
        )


class LeaveTypeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = LeaveType.objects.all()
    serializer_class = LeaveTypeSerializer
    permission_classes = [permissions.IsAuthenticated]


class LeaveBalanceMeView(APIView):
    """Retrieve current user's leave balances."""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses={200: LeaveBalanceSerializer(many=True)})
    def get(self, request):
        emp = get_or_create_employee_for_user(request.user)
        ensure_default_leave_balances(emp)
        balances = LeaveBalance.objects.filter(employee=emp).select_related("leave_type")
        serializer = LeaveBalanceSerializer(balances, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class LeaveBalanceListView(APIView):
    """Retrieve leave balances for a specific employee (Manager or HR scope)."""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses={200: LeaveBalanceSerializer(many=True)})
    def get(self, request):
        employee_id = request.query_params.get("employee")
        if not employee_id:
            return Response(
                {"detail": "Parameter 'employee' is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        emp = Employee.objects.filter(id=employee_id).first()
        if not emp:
            return Response({"detail": "Employee not found."}, status=status.HTTP_404_NOT_FOUND)

        ensure_default_leave_balances(emp)
        balances = LeaveBalance.objects.filter(employee=emp).select_related("leave_type")
        serializer = LeaveBalanceSerializer(balances, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class LeaveRequestViewSet(viewsets.ModelViewSet):
    queryset = LeaveRequest.objects.all().select_related("employee", "department", "leave_type")
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["status", "department_id"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        emp = getattr(user, "employee_profile", None)
        is_hr = user.role in ("super_admin", "hr_admin") or user.is_superuser
        is_manager = user.role == "manager"

        employee_id = self.request.query_params.get("employee")
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        elif not is_hr and not is_manager and emp:
            qs = qs.filter(employee=emp)
        return qs

    def get_serializer_class(self):
        if self.action == "create":
            return LeaveRequestWriteSerializer
        return LeaveRequestSerializer

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        emp = get_or_create_employee_for_user(request.user)
        ensure_default_leave_balances(emp)

        serializer = LeaveRequestWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        leave_type = data["leave_type"]
        start_date = data["start_date"]
        end_date = data["end_date"]
        partial = data.get("partial_day", "none")

        # Calculate requested days
        calendar_days = (end_date - start_date).days + 1
        req_days = 0.5 if partial in ("am", "pm") else float(calendar_days)

        # Check overlapping active requests
        overlapping = LeaveRequest.objects.filter(
            employee=emp,
            status__in=["pending", "approved"],
            start_date__lte=end_date,
            end_date__gte=start_date,
        ).exists()

        if overlapping:
            return Response(
                {
                    "detail": "You already have a pending or approved leave request during this date range."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        balance, _ = LeaveBalance.objects.get_or_create(
            employee=emp,
            leave_type=leave_type,
            defaults={"allocated_days": 20.0, "used_days": 0.0, "pending_days": 0.0},
        )

        if balance.available_days < req_days:
            return Response(
                {
                    "detail": f"Insufficient leave balance. Requested {req_days} days, but only {balance.available_days} available."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Reserve pending days
        balance.pending_days += req_days
        balance.save(update_fields=["pending_days", "updated_at"])

        dept = emp.department
        if not dept:
            from apps.organisations.models import Department

            dept = Department.objects.first()

        req_obj = LeaveRequest.objects.create(
            employee=emp,
            department=dept,
            leave_type=leave_type,
            start_date=start_date,
            end_date=end_date,
            partial_day=partial,
            days=req_days,
            reason=data["reason"],
            status="pending",
        )

        output_serializer = LeaveRequestSerializer(req_obj)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def withdraw(self, request, pk=None):
        """Withdraw a pending leave request and return reserved pending days."""
        leave_req = self.get_object()
        if leave_req.status != "pending":
            return Response(
                {"detail": f"Cannot withdraw a request that is already '{leave_req.status}'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        leave_req.status = "withdrawn"
        leave_req.save(update_fields=["status", "updated_at"])

        balance = LeaveBalance.objects.filter(
            employee=leave_req.employee, leave_type=leave_req.leave_type
        ).first()
        if balance:
            balance.pending_days = max(0.0, balance.pending_days - leave_req.days)
            balance.save(update_fields=["pending_days", "updated_at"])

        output_serializer = LeaveRequestSerializer(leave_req)
        return Response(output_serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def cancel(self, request, pk=None):
        """Cancel an approved leave request prior to start date."""
        leave_req = self.get_object()
        if leave_req.status != "approved":
            return Response(
                {"detail": "Only approved leave requests can be cancelled."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if leave_req.start_date < timezone.now().date():
            return Response(
                {"detail": "Cannot cancel leave that has already commenced or passed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        leave_req.status = "cancelled"
        leave_req.save(update_fields=["status", "updated_at"])

        balance = LeaveBalance.objects.filter(
            employee=leave_req.employee, leave_type=leave_req.leave_type
        ).first()
        if balance:
            balance.used_days = max(0.0, balance.used_days - leave_req.days)
            balance.save(update_fields=["used_days", "updated_at"])

        output_serializer = LeaveRequestSerializer(leave_req)
        return Response(output_serializer.data, status=status.HTTP_200_OK)
