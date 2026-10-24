from rest_framework import serializers

from apps.employees.models import Employee

from .models import Department, OrganisationSettings, Project, Team


class OrganisationSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrganisationSettings
        fields = [
            "name",
            "legal_name",
            "timezone",
            "work_week",
            "standard_start",
            "breaks_enabled",
            "date_format",
        ]


class DepartmentSerializer(serializers.ModelSerializer):
    head_id = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(),
        source="head",
        allow_null=True,
        required=False,
    )

    class Meta:
        model = Department
        fields = ["id", "name", "code", "head_id", "description"]


class TeamSerializer(serializers.ModelSerializer):
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(),
        source="department",
    )
    lead_id = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(),
        source="lead",
        allow_null=True,
        required=False,
    )

    class Meta:
        model = Team
        fields = ["id", "name", "department_id", "lead_id", "description"]


class ProjectSerializer(serializers.ModelSerializer):
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(),
        source="department",
    )
    lead_id = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(),
        source="lead",
        allow_null=True,
        required=False,
    )

    class Meta:
        model = Project
        fields = [
            "id",
            "key",
            "name",
            "description",
            "department_id",
            "lead_id",
            "status",
            "start_date",
            "target_date",
        ]
