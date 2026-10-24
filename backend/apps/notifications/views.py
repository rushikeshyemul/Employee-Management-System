from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notification, NotificationPreferences
from .serializers import NotificationPreferencesSerializer, NotificationSerializer


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["category"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False) or not self.request.user.is_authenticated:
            return Notification.objects.none()
        qs = Notification.objects.filter(recipient=self.request.user)
        category = self.request.query_params.get("category")
        unread = self.request.query_params.get("unread")

        if category:
            qs = qs.filter(category=category)
        if unread in ("1", "true"):
            qs = qs.filter(read_at__isnull=True)

        return qs

    @action(detail=True, methods=["post"])
    def read(self, request, pk=None):
        """Mark single notification as read."""
        notif = self.get_object()
        if not notif.read_at:
            notif.read_at = timezone.now()
            notif.save(update_fields=["read_at", "updated_at"])
        serializer = self.get_serializer(notif)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="read-all")
    def read_all(self, request):
        """Mark all unread notifications for requesting user as read."""
        count = Notification.objects.filter(recipient=request.user, read_at__isnull=True).update(
            read_at=timezone.now()
        )
        return Response(
            {"detail": f"Successfully marked {count} notifications as read."},
            status=status.HTTP_200_OK,
        )


class NotificationPreferencesView(APIView):
    """Retrieve or update in-app and email notification preferences."""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses={200: NotificationPreferencesSerializer})
    def get(self, request):
        prefs, _ = NotificationPreferences.objects.get_or_create(user=request.user)
        serializer = NotificationPreferencesSerializer(prefs)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        request=NotificationPreferencesSerializer,
        responses={200: NotificationPreferencesSerializer},
    )
    def patch(self, request):
        prefs, _ = NotificationPreferences.objects.get_or_create(user=request.user)
        serializer = NotificationPreferencesSerializer(prefs, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)
