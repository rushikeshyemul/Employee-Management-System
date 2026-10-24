from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    LeaveBalanceListView,
    LeaveBalanceMeView,
    LeaveRequestViewSet,
    LeaveTypeViewSet,
)

router = DefaultRouter()
router.register(r"types", LeaveTypeViewSet, basename="leave-type")
router.register(r"requests", LeaveRequestViewSet, basename="leave-request")

urlpatterns = [
    path("balances/me/", LeaveBalanceMeView.as_view(), name="leave-balance-me"),
    path("balances/", LeaveBalanceListView.as_view(), name="leave-balance-list"),
    path("", include(router.urls)),
]
