import uuid

from django.db import transaction
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.models import User
from apps.organisations.models import Department, Team

from .models import Employee
from .serializers import (
    EmployeeSerializer,
    EmployeeWriteSerializer,
    ProfileWriteSerializer,
)


class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.all().select_related("user", "department", "team", "manager")
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = [
        "department_id",
        "manager_id",
        "location",
        "employment_type",
        "status",
        "team_id",
    ]
    search_fields = ["first_name", "last_name", "email", "employee_code", "job_title"]
    ordering_fields = ["first_name", "last_name", "start_date", "employee_code"]

    def get_serializer_class(self):
        if self.action == "create":
            return EmployeeWriteSerializer
        if self.action in ("update", "partial_update") and self.kwargs.get("pk") == "me":
            return ProfileWriteSerializer
        return EmployeeSerializer

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        is_hr = request.user.role in ("super_admin", "hr_admin") or request.user.is_superuser
        has_manage = is_hr or "employees.manage" in (request.user.permissions or [])
        if not has_manage:
            return Response(
                {"detail": "You do not have permission to create employees."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = EmployeeWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        email = data["email"]
        role = data.get("role", "employee")
        invite = data.get("invite", False)

        # Check or create user
        user, _ = User.objects.get_or_create(
            email=email,
            defaults={
                "first_name": data["first_name"],
                "last_name": data["last_name"],
                "role": role,
                "is_active": not invite,
            },
        )

        dept = None
        if data.get("department_id"):
            dept = Department.objects.filter(id=data["department_id"]).first()

        team = None
        if data.get("team_id"):
            team = Team.objects.filter(id=data["team_id"]).first()

        manager = None
        if data.get("manager_id"):
            manager = Employee.objects.filter(id=data["manager_id"]).first()

        code = f"EMP-{uuid.uuid4().hex[:6].upper()}"

        emp = Employee.objects.create(
            user=user,
            employee_code=code,
            first_name=data["first_name"],
            last_name=data["last_name"],
            email=email,
            job_title=data["job_title"],
            department=dept,
            team=team,
            manager=manager,
            location=data.get("location", "Headquarters"),
            employment_type=data.get("employment_type", "full_time"),
            status="invited" if invite else "active",
            start_date=data["start_date"],
            phone=data.get("phone"),
        )

        output_serializer = EmployeeSerializer(emp, context={"request": request})
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def deactivate(self, request, pk=None):
        """Deactivate an employee and their corresponding user login."""
        is_hr = request.user.role in ("super_admin", "hr_admin") or request.user.is_superuser
        has_deactivate = is_hr or "employees.deactivate" in (request.user.permissions or [])
        if not has_deactivate:
            return Response(
                {"detail": "You do not have permission to deactivate employees."},
                status=status.HTTP_403_FORBIDDEN,
            )

        employee = self.get_object()
        employee.status = "inactive"
        employee.save(update_fields=["status", "updated_at"])

        if employee.user:
            employee.user.is_active = False
            employee.user.save(update_fields=["is_active", "updated_at"])

        serializer = EmployeeSerializer(employee, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get", "patch"])
    def me(self, request):
        """Retrieve or update profile details for current user's employee record."""
        employee = Employee.objects.filter(user=request.user).first()
        if not employee:
            return Response(
                {"detail": "Employee profile not found for current user."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if request.method == "GET":
            serializer = EmployeeSerializer(employee, context={"request": request})
            return Response(serializer.data, status=status.HTTP_200_OK)

        serializer = ProfileWriteSerializer(employee, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        output_serializer = EmployeeSerializer(employee, context={"request": request})
        return Response(output_serializer.data, status=status.HTTP_200_OK)
