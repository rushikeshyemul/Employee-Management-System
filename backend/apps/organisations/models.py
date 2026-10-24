import uuid

from django.db import models

from apps.common.models import TimeStampedModel


def generate_dept_id():
    return f"dept_{uuid.uuid4().hex[:8]}"


def generate_team_id():
    return f"team_{uuid.uuid4().hex[:8]}"


def generate_project_id():
    return f"prj_{uuid.uuid4().hex[:8]}"


class OrganisationSettings(TimeStampedModel):
    name = models.CharField(max_length=255, default="Helios Industries")
    legal_name = models.CharField(max_length=255, default="Helios Industries Ltd.")
    timezone = models.CharField(max_length=50, default="UTC")
    work_week = models.JSONField(default=list)  # e.g., [1, 2, 3, 4, 5]
    standard_start = models.CharField(max_length=10, default="09:00")
    breaks_enabled = models.BooleanField(default=True)
    date_format = models.CharField(max_length=20, default="YYYY-MM-DD")

    class Meta:
        verbose_name = "Organisation Settings"
        verbose_name_plural = "Organisation Settings"

    def __str__(self):
        return self.name


class Department(TimeStampedModel):
    id = models.CharField(max_length=64, primary_key=True, default=generate_dept_id)
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, unique=True, db_index=True)
    head = models.ForeignKey(
        "employees.Employee",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="headed_departments",
    )
    description = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.code})"


class Team(TimeStampedModel):
    id = models.CharField(max_length=64, primary_key=True, default=generate_team_id)
    name = models.CharField(max_length=255)
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name="teams")
    lead = models.ForeignKey(
        "employees.Employee",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="led_teams",
    )
    description = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} - {self.department.name}"


class Project(TimeStampedModel):
    STATUS_CHOICES = (
        ("planned", "Planned"),
        ("active", "Active"),
        ("on_hold", "On Hold"),
        ("completed", "Completed"),
    )

    id = models.CharField(max_length=64, primary_key=True, default=generate_project_id)
    key = models.CharField(max_length=20, unique=True, db_index=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name="projects")
    lead = models.ForeignKey(
        "employees.Employee",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="led_projects",
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    start_date = models.DateField(null=True, blank=True)
    target_date = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ["key"]

    def __str__(self):
        return f"[{self.key}] {self.name}"
