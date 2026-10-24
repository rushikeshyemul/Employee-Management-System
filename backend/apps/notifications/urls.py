from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import NotificationPreferencesView, NotificationViewSet

router = DefaultRouter()
router.register(r"", NotificationViewSet, basename="notification")

urlpatterns = [
    path("preferences/", NotificationPreferencesView.as_view(), name="notification-preferences"),
    path("", include(router.urls)),
]
