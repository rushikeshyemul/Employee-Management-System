from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Department, OrganisationSettings, Project, Team
from .serializers import (
    DepartmentSerializer,
    OrganisationSettingsSerializer,
    ProjectSerializer,
    TeamSerializer,
)


class OrganisationSettingsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses={200: OrganisationSettingsSerializer})
    def get(self, request):
        settings_obj, _ = OrganisationSettings.objects.get_or_create(
            id=1,
            defaults={
                "name": "Helios Industries",
                "legal_name": "Helios Industries Ltd.",
                "timezone": "UTC",
                "work_week": [1, 2, 3, 4, 5],
                "standard_start": "09:00",
                "breaks_enabled": True,
                "date_format": "YYYY-MM-DD",
            },
        )
        serializer = OrganisationSettingsSerializer(settings_obj)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        request=OrganisationSettingsSerializer,
        responses={200: OrganisationSettingsSerializer},
    )
    def patch(self, request):
        if not (request.user.role in ("super_admin", "hr_admin") or request.user.is_superuser):
            return Response(
                {"detail": "Only administrators can update organisation settings."},
                status=status.HTTP_403_FORBIDDEN,
            )
        settings_obj, _ = OrganisationSettings.objects.get_or_create(id=1)
        serializer = OrganisationSettingsSerializer(settings_obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)


class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all().select_related("head")
    serializer_class = DepartmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["code"]
    search_fields = ["name", "code", "description"]
    ordering_fields = ["name", "code", "created_at"]


class TeamViewSet(viewsets.ModelViewSet):
    queryset = Team.objects.all().select_related("department", "lead")
    serializer_class = TeamSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["department_id"]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at"]


class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all().select_related("department", "lead")
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["department_id", "status"]
    search_fields = ["name", "key", "description"]
    ordering_fields = ["key", "name", "start_date", "target_date"]
