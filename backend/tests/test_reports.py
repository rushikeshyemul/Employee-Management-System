import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.employees.models import Employee
from apps.organisations.models import Department, Project
from apps.tasks.models import Task


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def report_setup(db):
    dept = Department.objects.create(name="Engineering", code="ENG")
    user = User.objects.create_user(
        email="lead@helios.example", password="WorkforceHub1!", role="super_admin"
    )
    emp = Employee.objects.create(
        user=user,
        employee_code="EMP-LEAD",
        first_name="Lead",
        last_name="Tech",
        email="lead@helios.example",
        job_title="VP Engineering",
        department=dept,
    )
    proj = Project.objects.create(key="PRJ-HUB", name="Hub App", department=dept)
    Task.objects.create(
        key="PRJ-HUB-1",
        title="Frontend Auth",
        project=proj,
        department=dept,
        assignee=emp,
        reporter=emp,
        status="in_progress",
    )
    return {"user": user, "emp": emp, "project": proj}


@pytest.mark.django_db
class TestReports:
    def test_dashboard_report(self, api_client, report_setup):
        api_client.force_authenticate(user=report_setup["user"])
        res = api_client.get("/api/v1/reports/dashboard/")
        assert res.status_code == status.HTTP_200_OK
        data = res.json()

        assert "metrics" in data
        assert "task_summary" in data
        assert "upcoming_deadlines" in data
        assert "leave_balances" in data
        assert "organisation" in data
        assert data["scope"] == "organisation"

    def test_global_search(self, api_client, report_setup):
        api_client.force_authenticate(user=report_setup["user"])
        res = api_client.get("/api/v1/search/?q=Frontend")
        assert res.status_code == status.HTTP_200_OK
        data = res.json()
        assert len(data["tasks"]) == 1
        assert data["tasks"][0]["key"] == "PRJ-HUB-1"

    def test_task_report(self, api_client, report_setup):
        api_client.force_authenticate(user=report_setup["user"])
        res = api_client.get("/api/v1/reports/tasks/")
        assert res.status_code == status.HTTP_200_OK
        data = res.json()
        assert "by_status" in data
        assert "by_priority" in data
        assert "open_tasks" in data

    def test_attendance_report(self, api_client, report_setup):
        api_client.force_authenticate(user=report_setup["user"])
        res = api_client.get("/api/v1/reports/attendance/")
        assert res.status_code == status.HTTP_200_OK
        data = res.json()
        assert "summary" in data
        assert "present" in data["summary"]

    def test_leave_report(self, api_client, report_setup):
        api_client.force_authenticate(user=report_setup["user"])
        res = api_client.get("/api/v1/reports/leave/")
        assert res.status_code == status.HTTP_200_OK
        data = res.json()
        assert "requests" in data

    def test_headcount_report(self, api_client, report_setup):
        api_client.force_authenticate(user=report_setup["user"])
        res = api_client.get("/api/v1/reports/headcount/")
        assert res.status_code == status.HTTP_200_OK
        data = res.json()
        assert "total" in data
        assert "active" in data
        assert "by_department" in data
