from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.tasks.serializers import PersonRefSerializer, serialize_person_ref

from .models import AttendanceCorrection, AttendanceRecord


class AttendanceRecordSerializer(serializers.ModelSerializer):
    employee_id = serializers.CharField(source="employee.id", read_only=True)
    department_id = serializers.CharField(source="department.id", read_only=True)
    employee = serializers.SerializerMethodField()

    class Meta:
        model = AttendanceRecord
        fields = [
            "id",
            "employee_id",
            "employee",
            "department_id",
            "date",
            "clock_in_at",
            "clock_out_at",
            "break_minutes",
            "worked_minutes",
            "status",
            "exceptions",
            "timezone",
        ]

    @extend_schema_field(PersonRefSerializer)
    def get_employee(self, obj):
        return serialize_person_ref(obj.employee)


class AttendanceCorrectionSerializer(serializers.ModelSerializer):
    employee_id = serializers.CharField(source="employee.id", read_only=True)
    employee = serializers.SerializerMethodField()

    class Meta:
        model = AttendanceCorrection
        fields = [
            "id",
            "employee_id",
            "employee",
            "date",
            "requested_clock_in_at",
            "requested_clock_out_at",
            "reason",
            "status",
            "reviewer_comment",
            "created_at",
            "decided_at",
        ]
        read_only_fields = ["id", "employee_id", "employee", "status", "created_at", "decided_at"]

    @extend_schema_field(PersonRefSerializer)
    def get_employee(self, obj):
        return serialize_person_ref(obj.employee)


class AttendanceCorrectionWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendanceCorrection
        fields = [
            "id",
            "date",
            "requested_clock_in_at",
            "requested_clock_out_at",
            "reason",
            "status",
        ]
        read_only_fields = ["id", "status"]


class AttendanceTodaySerializer(serializers.Serializer):
    date = serializers.DateField()
    status = serializers.CharField()
    clock_in_at = serializers.DateTimeField(allow_null=True)
    clock_out_at = serializers.DateTimeField(allow_null=True)
    break_started_at = serializers.DateTimeField(allow_null=True)
    break_minutes = serializers.IntegerField()
    worked_minutes = serializers.IntegerField()
    timezone = serializers.CharField()
    is_late = serializers.BooleanField()
    missing_clock_out = serializers.BooleanField()
    breaks_enabled = serializers.BooleanField()
    standard_start = serializers.CharField()
