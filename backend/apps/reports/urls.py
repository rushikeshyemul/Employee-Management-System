from django.urls import path

from .views import (
    AttendanceReportView,
    DashboardReportView,
    GlobalSearchView,
    HeadcountReportView,
    LeaveReportView,
    TaskReportView,
)

urlpatterns = [
    path("dashboard/", DashboardReportView.as_view(), name="report-dashboard"),
    path("tasks/", TaskReportView.as_view(), name="report-tasks"),
    path("attendance/", AttendanceReportView.as_view(), name="report-attendance"),
    path("leave/", LeaveReportView.as_view(), name="report-leave"),
    path("headcount/", HeadcountReportView.as_view(), name="report-headcount"),
    path("search/", GlobalSearchView.as_view(), name="global-search"),
]
