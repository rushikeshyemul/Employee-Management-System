import uuid

from django.db import models
from django.utils import timezone

from apps.common.models import TimeStampedModel


def generate_att_id():
    return f"att_rec_{uuid.uuid4().hex[:8]}"


def generate_corr_id():
    return f"corr_{uuid.uuid4().hex[:8]}"


class AttendanceRecord(TimeStampedModel):
    STATUS_CHOICES = (
        ("present", "Present"),
        ("late", "Late"),
        ("absent", "Absent"),
        ("partial", "Partial"),
        ("leave", "On Leave"),
        ("holiday", "Holiday"),
    )

    id = models.CharField(max_length=64, primary_key=True, default=generate_att_id)
    employee = models.ForeignKey(
        "employees.Employee", on_delete=models.CASCADE, related_name="attendance_records"
    )
    department = models.ForeignKey(
        "organisations.Department", on_delete=models.PROTECT, related_name="attendance_records"
    )
    date = models.DateField(default=timezone.now, db_index=True)
    clock_in_at = models.DateTimeField(null=True, blank=True)
    clock_out_at = models.DateTimeField(null=True, blank=True)
    break_started_at = models.DateTimeField(null=True, blank=True)
    break_minutes = models.IntegerField(default=0)
    worked_minutes = models.IntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="present")
    exceptions = models.JSONField(default=list, blank=True)
    timezone = models.CharField(max_length=50, default="UTC")

    class Meta:
        ordering = ["-date"]
        unique_together = ("employee", "date")

    def __str__(self):
        return f"{self.employee.email} - {self.date} ({self.status})"


class AttendanceCorrection(TimeStampedModel):
    STATUS_CHOICES = (
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
    )

    id = models.CharField(max_length=64, primary_key=True, default=generate_corr_id)
    employee = models.ForeignKey(
        "employees.Employee", on_delete=models.CASCADE, related_name="attendance_corrections"
    )
    date = models.DateField()
    requested_clock_in_at = models.DateTimeField(null=True, blank=True)
    requested_clock_out_at = models.DateTimeField(null=True, blank=True)
    reason = models.TextField()
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="pending", db_index=True
    )
    reviewer_comment = models.TextField(null=True, blank=True)
    decided_at = models.DateTimeField(null=True, blank=True)
    decided_by = models.ForeignKey(
        "employees.Employee",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="decided_corrections",
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Correction for {self.employee.email} on {self.date}"
