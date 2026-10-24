import uuid

from django.db import models
from django.utils import timezone

from apps.common.models import TimeStampedModel


def generate_emp_id():
    return f"emp_{uuid.uuid4().hex[:8]}"


class Employee(TimeStampedModel):
    EMPLOYMENT_STATUS_CHOICES = (
        ("active", "Active"),
        ("invited", "Invited"),
        ("on_leave", "On Leave"),
        ("inactive", "Inactive"),
        ("offboarding", "Offboarding"),
    )

    EMPLOYMENT_TYPE_CHOICES = (
        ("full_time", "Full Time"),
        ("part_time", "Part Time"),
        ("contract", "Contract"),
        ("intern", "Intern"),
    )

    id = models.CharField(max_length=64, primary_key=True, default=generate_emp_id)
    user = models.OneToOneField(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="employee_profile",
    )
    employee_code = models.CharField(max_length=50, unique=True, db_index=True)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    preferred_name = models.CharField(max_length=150, blank=True, null=True)
    email = models.EmailField(unique=True, db_index=True)
    personal_email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    job_title = models.CharField(max_length=200)

    department = models.ForeignKey(
        "organisations.Department",
        on_delete=models.PROTECT,
        related_name="employees",
        null=True,
        blank=True,
    )
    team = models.ForeignKey(
        "organisations.Team",
        on_delete=models.SET_NULL,
        related_name="members",
        null=True,
        blank=True,
    )
    manager = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        related_name="direct_reports",
        null=True,
        blank=True,
    )

    location = models.CharField(max_length=100, default="Headquarters")
    employment_type = models.CharField(
        max_length=50, choices=EMPLOYMENT_TYPE_CHOICES, default="full_time"
    )
    status = models.CharField(
        max_length=50, choices=EMPLOYMENT_STATUS_CHOICES, default="active", db_index=True
    )
    start_date = models.DateField(default=timezone.now)
    end_date = models.DateField(null=True, blank=True)
    avatar_url = models.URLField(max_length=500, blank=True, null=True)
    bio = models.TextField(blank=True, default="")

    emergency_contact_name = models.CharField(max_length=150, blank=True, null=True)
    emergency_contact_phone = models.CharField(max_length=50, blank=True, null=True)

    # Sensitive fields: restricted by employees.view_sensitive permission
    salary_band = models.CharField(max_length=50, blank=True, null=True)
    date_of_birth = models.DateField(blank=True, null=True)

    class Meta:
        ordering = ["first_name", "last_name"]

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.employee_code})"

    @property
    def display_name(self):
        if self.preferred_name:
            return f"{self.preferred_name} {self.last_name}"
        return f"{self.first_name} {self.last_name}"
