from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AttendanceCorrectionViewSet,
    AttendanceMeView,
    AttendanceRecordViewSet,
    BreakEndView,
    BreakStartView,
    ClockInView,
    ClockOutView,
)

router = DefaultRouter()
router.register(r"records", AttendanceRecordViewSet, basename="attendance-record")
router.register(r"corrections", AttendanceCorrectionViewSet, basename="attendance-correction")

urlpatterns = [
    path("me/", AttendanceMeView.as_view(), name="attendance-me"),
    path("clock-in/", ClockInView.as_view(), name="clock-in"),
    path("clock-out/", ClockOutView.as_view(), name="clock-out"),
    path("breaks/start/", BreakStartView.as_view(), name="break-start"),
    path("breaks/end/", BreakEndView.as_view(), name="break-end"),
    path("", include(router.urls)),
]
