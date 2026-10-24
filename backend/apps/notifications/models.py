import uuid

from django.db import models

from apps.common.models import TimeStampedModel


def generate_notif_id():
    return f"notif_{uuid.uuid4().hex[:8]}"


class Notification(TimeStampedModel):
    CATEGORY_CHOICES = (
        ("task", "Task"),
        ("leave", "Leave"),
        ("attendance", "Attendance"),
        ("approval", "Approval"),
        ("hr", "HR"),
        ("system", "System"),
    )

    id = models.CharField(max_length=64, primary_key=True, default=generate_notif_id)
    recipient = models.ForeignKey(
        "accounts.User", on_delete=models.CASCADE, related_name="notifications"
    )
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES, default="system")
    title = models.CharField(max_length=255)
    body = models.TextField()
    href = models.CharField(max_length=255, null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.recipient.email}: {self.title}"


def default_notification_categories():
    return {
        "task": True,
        "leave": True,
        "attendance": True,
        "approval": True,
        "hr": True,
        "system": True,
    }


class NotificationPreferences(TimeStampedModel):
    user = models.OneToOneField(
        "accounts.User", on_delete=models.CASCADE, related_name="notification_preferences"
    )
    email_enabled = models.BooleanField(default=True)
    in_app_enabled = models.BooleanField(default=True)
    categories = models.JSONField(default=default_notification_categories)

    class Meta:
        verbose_name = "Notification Preferences"
        verbose_name_plural = "Notification Preferences"

    def __str__(self):
        return f"Preferences for {self.user.email}"
