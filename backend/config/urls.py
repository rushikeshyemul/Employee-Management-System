from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

from apps.reports.views import GlobalSearchView

urlpatterns = [
    path("admin/", admin.site.urls),
    # OpenAPI Schema & Interactive Documentation
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    # API v1 endpoints
    path("api/v1/auth/", include("apps.accounts.urls")),
    path("api/v1/employees/", include("apps.employees.urls")),
    path("api/v1/tasks/", include("apps.tasks.urls")),
    path("api/v1/attendance/", include("apps.attendance.urls")),
    path("api/v1/leave/", include("apps.leave_management.urls")),
    path("api/v1/approvals/", include("apps.approvals.urls")),
    path("api/v1/notifications/", include("apps.notifications.urls")),
    path("api/v1/reports/", include("apps.reports.urls")),
    path("api/v1/search/", GlobalSearchView.as_view(), name="search"),
    path("api/v1/", include("apps.organisations.urls")),
]
