import uuid

from django.db import models

from apps.common.models import TimeStampedModel


def generate_task_id():
    return f"tsk_{uuid.uuid4().hex[:8]}"


def generate_comment_id():
    return f"cmt_{uuid.uuid4().hex[:8]}"


def generate_event_id():
    return f"evt_{uuid.uuid4().hex[:8]}"


def generate_attachment_id():
    return f"att_{uuid.uuid4().hex[:8]}"


class Task(TimeStampedModel):
    STATUS_CHOICES = (
        ("backlog", "Backlog"),
        ("todo", "To Do"),
        ("in_progress", "In Progress"),
        ("in_review", "In Review"),
        ("changes_requested", "Changes Requested"),
        ("done", "Done"),
        ("blocked", "Blocked"),
    )

    PRIORITY_CHOICES = (
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
        ("urgent", "Urgent"),
    )

    ASSIGNMENT_STATE_CHOICES = (
        ("pending_acceptance", "Pending Acceptance"),
        ("accepted", "Accepted"),
        ("clarification_requested", "Clarification Requested"),
        ("rejected", "Rejected"),
    )

    id = models.CharField(max_length=64, primary_key=True, default=generate_task_id)
    key = models.CharField(max_length=30, unique=True, db_index=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    project = models.ForeignKey(
        "organisations.Project", on_delete=models.CASCADE, related_name="tasks"
    )
    department = models.ForeignKey(
        "organisations.Department", on_delete=models.PROTECT, related_name="tasks"
    )
    team = models.ForeignKey(
        "organisations.Team", on_delete=models.SET_NULL, null=True, blank=True, related_name="tasks"
    )
    assignee = models.ForeignKey(
        "employees.Employee",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_tasks",
    )
    reporter = models.ForeignKey(
        "employees.Employee", on_delete=models.PROTECT, related_name="reported_tasks"
    )
    reviewer = models.ForeignKey(
        "employees.Employee",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_tasks",
    )
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default="medium")
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default="todo", db_index=True)
    assignment_state = models.CharField(
        max_length=30, choices=ASSIGNMENT_STATE_CHOICES, default="accepted"
    )
    rejection_reason = models.TextField(null=True, blank=True)
    clarification_note = models.TextField(null=True, blank=True)
    block_reason = models.TextField(null=True, blank=True)
    blocked_from = models.CharField(max_length=30, null=True, blank=True)
    start_date = models.DateField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    labels = models.JSONField(default=list, blank=True)
    parent = models.ForeignKey(
        "self", on_delete=models.SET_NULL, null=True, blank=True, related_name="subtasks"
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.key}] {self.title}"


class TaskComment(TimeStampedModel):
    id = models.CharField(max_length=64, primary_key=True, default=generate_comment_id)
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="comments")
    author = models.ForeignKey(
        "employees.Employee", on_delete=models.CASCADE, related_name="task_comments"
    )
    body = models.TextField()

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Comment on {self.task.key} by {self.author.email}"


class TaskEvent(TimeStampedModel):
    id = models.CharField(max_length=64, primary_key=True, default=generate_event_id)
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="events")
    actor = models.ForeignKey(
        "employees.Employee", on_delete=models.CASCADE, related_name="task_events"
    )
    message = models.CharField(max_length=500)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.actor.email}: {self.message}"


class TaskAttachment(TimeStampedModel):
    id = models.CharField(max_length=64, primary_key=True, default=generate_attachment_id)
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="attachments")
    name = models.CharField(max_length=255)
    size = models.IntegerField(default=0)
    content_type = models.CharField(max_length=100, default="application/octet-stream")
    url = models.CharField(max_length=500, null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
