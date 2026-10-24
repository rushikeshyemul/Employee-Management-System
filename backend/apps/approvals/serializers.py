from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.tasks.serializers import PersonRefSerializer, serialize_person_ref

from .models import Approval


class ApprovalSerializer(serializers.ModelSerializer):
    employee_id = serializers.CharField(source="employee.id", read_only=True)
    decided_by = serializers.CharField(source="decided_by.id", allow_null=True, read_only=True)
    employee = serializers.SerializerMethodField()

    class Meta:
        model = Approval
        fields = [
            "id",
            "type",
            "subject_id",
            "employee_id",
            "employee",
            "title",
            "summary",
            "status",
            "submitted_at",
            "decided_at",
            "decided_by",
            "comment",
            "context",
            "history",
        ]
        read_only_fields = fields

    @extend_schema_field(PersonRefSerializer)
    def get_employee(self, obj):
        return serialize_person_ref(obj.employee)


class ApprovalDecisionRequestSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(choices=["approve", "reject", "request_changes"])
    comment = serializers.CharField(required=False, allow_blank=True, default="")
