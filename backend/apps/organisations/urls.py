from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    DepartmentViewSet,
    OrganisationSettingsView,
    ProjectViewSet,
    TeamViewSet,
)

router = DefaultRouter()
router.register(r"departments", DepartmentViewSet, basename="department")
router.register(r"teams", TeamViewSet, basename="team")
router.register(r"projects", ProjectViewSet, basename="project")

urlpatterns = [
    path(
        "organisation/settings/", OrganisationSettingsView.as_view(), name="organisation-settings"
    ),
    path("", include(router.urls)),
]
