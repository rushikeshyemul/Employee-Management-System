from rest_framework import serializers

from .models import Notification, NotificationPreferences


class NotificationSerializer(serializers.ModelSerializer):
    recipient_id = serializers.CharField(source="recipient.id", read_only=True)

    class Meta:
        model = Notification
        fields = [
            "id",
            "recipient_id",
            "category",
            "title",
            "body",
            "href",
            "read_at",
            "created_at",
        ]
        read_only_fields = fields


class NotificationPreferencesSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreferences
        fields = ["email_enabled", "in_app_enabled", "categories"]
