import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.notifications.models import Notification


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user_with_notifications(db):
    user = User.objects.create_user(email="notif.user@helios.example", password="WorkforceHub1!")
    n1 = Notification.objects.create(
        recipient=user,
        category="task",
        title="Task Assigned",
        body="You were assigned PRJ-HUB-1",
    )
    n2 = Notification.objects.create(
        recipient=user,
        category="approval",
        title="Leave Approved",
        body="Your vacation has been approved.",
    )
    return {"user": user, "n1": n1, "n2": n2}


@pytest.mark.django_db
class TestNotifications:
    def test_list_notifications_and_read(self, api_client, user_with_notifications):
        user = user_with_notifications["user"]
        n1 = user_with_notifications["n1"]
        api_client.force_authenticate(user=user)

        res = api_client.get("/api/v1/notifications/")
        assert res.status_code == status.HTTP_200_OK
        assert res.json()["count"] == 2

        # Mark n1 as read
        read_res = api_client.post(f"/api/v1/notifications/{n1.id}/read/")
        assert read_res.status_code == status.HTTP_200_OK
        assert read_res.json()["read_at"] is not None

        # Filter unread
        unread_res = api_client.get("/api/v1/notifications/?unread=1")
        assert unread_res.json()["count"] == 1

        # Mark all read
        all_res = api_client.post("/api/v1/notifications/read-all/")
        assert all_res.status_code == status.HTTP_200_OK

        unread_res2 = api_client.get("/api/v1/notifications/?unread=1")
        assert unread_res2.json()["count"] == 0

    def test_notification_preferences_get_and_patch(self, api_client, user_with_notifications):
        user = user_with_notifications["user"]
        api_client.force_authenticate(user=user)

        # GET preferences
        res = api_client.get("/api/v1/notifications/preferences/")
        assert res.status_code == status.HTTP_200_OK
        data = res.json()
        assert "in_app_enabled" in data
        assert "email_enabled" in data
        assert data["email_enabled"] is True

        # PATCH preferences
        patch_res = api_client.patch(
            "/api/v1/notifications/preferences/",
            {"email_enabled": False},
            format="json",
        )
        assert patch_res.status_code == status.HTTP_200_OK
        assert patch_res.json()["email_enabled"] is False
