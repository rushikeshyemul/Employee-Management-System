import uuid

from django.db import models

from apps.common.models import TimeStampedModel


def generate_lt_id():
    return f"lt_{uuid.uuid4().hex[:8]}"


def generate_lb_id():
    return f"lb_{uuid.uuid4().hex[:8]}"


def generate_lr_id():
    return f"lr_{uuid.uuid4().hex[:8]}"


class LeaveType(TimeStampedModel):
    id = models.CharField(max_length=64, primary_key=True, default=generate_lt_id)
    code = models.CharField(max_length=50, unique=True, db_index=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    requires_attachment = models.BooleanField(default=False)
    allow_partial_day = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.code})"


class LeaveBalance(TimeStampedModel):
    id = models.CharField(max_length=64, primary_key=True, default=generate_lb_id)
    employee = models.ForeignKey(
        "employees.Employee", on_delete=models.CASCADE, related_name="leave_balances"
    )
    leave_type = models.ForeignKey(LeaveType, on_delete=models.PROTECT, related_name="balances")
    allocated_days = models.FloatField(default=20.0)
    used_days = models.FloatField(default=0.0)
    pending_days = models.FloatField(default=0.0)

    class Meta:
        ordering = ["leave_type__name"]
        unique_together = ("employee", "leave_type")

    def __str__(self):
        return f"{self.employee.email} - {self.leave_type.code}: {self.available_days} days left"

    @property
    def available_days(self) -> float:
        return max(0.0, self.allocated_days - self.used_days - self.pending_days)


class LeaveRequest(TimeStampedModel):
    STATUS_CHOICES = (
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
        ("withdrawn", "Withdrawn"),
        ("cancelled", "Cancelled"),
    )

    PARTIAL_DAY_CHOICES = (
        ("none", "None"),
        ("am", "Morning (AM)"),
        ("pm", "Afternoon (PM)"),
    )

    id = models.CharField(max_length=64, primary_key=True, default=generate_lr_id)
    employee = models.ForeignKey(
        "employees.Employee", on_delete=models.CASCADE, related_name="leave_requests"
    )
    department = models.ForeignKey(
        "organisations.Department", on_delete=models.PROTECT, related_name="leave_requests"
    )
    leave_type = models.ForeignKey(LeaveType, on_delete=models.PROTECT, related_name="requests")
    start_date = models.DateField(db_index=True)
    end_date = models.DateField(db_index=True)
    partial_day = models.CharField(max_length=10, choices=PARTIAL_DAY_CHOICES, default="none")
    days = models.FloatField(default=1.0)
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
        related_name="reviewed_leave_requests",
    )
    warnings = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return (
            f"{self.employee.email}: {self.leave_type.name} ({self.start_date} to {self.end_date})"
        )
