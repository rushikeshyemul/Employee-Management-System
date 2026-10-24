from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.tasks.serializers import PersonRefSerializer, serialize_person_ref

from .models import LeaveBalance, LeaveRequest, LeaveType


class LeaveTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeaveType
        fields = [
            "id",
            "code",
            "name",
            "description",
            "requires_attachment",
            "allow_partial_day",
        ]


class LeaveBalanceSerializer(serializers.ModelSerializer):
    leave_type_id = serializers.CharField(source="leave_type.id", read_only=True)
    leave_type_name = serializers.CharField(source="leave_type.name", read_only=True)
    code = serializers.CharField(source="leave_type.code", read_only=True)
    available_days = serializers.FloatField(read_only=True)

    class Meta:
        model = LeaveBalance
        fields = [
            "leave_type_id",
            "leave_type_name",
            "code",
            "allocated_days",
            "used_days",
            "pending_days",
            "available_days",
        ]


class LeaveRequestSerializer(serializers.ModelSerializer):
    employee_id = serializers.CharField(source="employee.id", read_only=True)
    department_id = serializers.CharField(source="department.id", read_only=True)
    leave_type_id = serializers.CharField(source="leave_type.id", read_only=True)
    leave_type_name = serializers.CharField(source="leave_type.name", read_only=True)
    employee = serializers.SerializerMethodField()

    class Meta:
        model = LeaveRequest
        fields = [
            "id",
            "employee_id",
            "employee",
            "department_id",
            "leave_type_id",
            "leave_type_name",
            "start_date",
            "end_date",
            "partial_day",
            "days",
            "reason",
            "status",
            "reviewer_comment",
            "created_at",
            "decided_at",
            "warnings",
        ]
        read_only_fields = fields

    @extend_schema_field(PersonRefSerializer)
    def get_employee(self, obj):
        return serialize_person_ref(obj.employee)


class LeaveRequestWriteSerializer(serializers.ModelSerializer):
    leave_type_id = serializers.PrimaryKeyRelatedField(
        queryset=LeaveType.objects.all(), source="leave_type"
    )

    class Meta:
        model = LeaveRequest
        fields = [
            "leave_type_id",
            "start_date",
            "end_date",
            "partial_day",
            "reason",
        ]

    def validate(self, attrs):
        start = attrs["start_date"]
        end = attrs["end_date"]
        if end < start:
            raise serializers.ValidationError(
                {"end_date": ["End date cannot be prior to start date."]}
            )
        return attrs
