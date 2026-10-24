import uuid

from django.db import models
from django.utils import timezone

from apps.common.models import TimeStampedModel


def generate_appr_id():
    return f"appr_{uuid.uuid4().hex[:8]}"


class Approval(TimeStampedModel):
    TYPE_CHOICES = (
        ("leave", "Leave Request"),
        ("attendance_correction", "Attendance Correction"),
        ("hr_request", "HR Request"),
        ("profile_change", "Profile Change"),
    )

    STATUS_CHOICES = (
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
        ("changes_requested", "Changes Requested"),
    )

    id = models.CharField(max_length=64, primary_key=True, default=generate_appr_id)
    type = models.CharField(max_length=40, choices=TYPE_CHOICES, db_index=True)
    subject_id = models.CharField(max_length=64, db_index=True)
    employee = models.ForeignKey(
        "employees.Employee", on_delete=models.CASCADE, related_name="submitted_approvals"
    )
    approver = models.ForeignKey(
        "employees.Employee",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_approvals",
    )
    title = models.CharField(max_length=255)
    summary = models.TextField(blank=True, default="")
    status = models.CharField(
        max_length=30, choices=STATUS_CHOICES, default="pending", db_index=True
    )
    submitted_at = models.DateTimeField(default=timezone.now)
    decided_at = models.DateTimeField(null=True, blank=True)
    decided_by = models.ForeignKey(
        "employees.Employee",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="resolved_approvals",
    )
    comment = models.TextField(null=True, blank=True)
    context = models.JSONField(default=list, blank=True)  # [{ "label": "...", "value": "..." }]
    history = models.JSONField(
        default=list, blank=True
    )  # [{ "at": "...", "actor": "...", "message": "..." }]

    class Meta:
        ordering = ["-submitted_at"]

    def __str__(self):
        return f"[{self.type}] {self.title} - {self.status}"
