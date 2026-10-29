import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.employees.models import Employee
from apps.organisations.models import Department


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user_with_employee(db):
    dept = Department.objects.create(name="People Ops", code="PEOPLE")
    user = User.objects.create_user(email="staff@helios.example", password="WorkforceHub1!")
    emp = Employee.objects.create(
        user=user,
        employee_code="EMP-STF",
        first_name="Staff",
        last_name="Member",
        email="staff@helios.example",
        job_title="HR Specialist",
        department=dept,
    )
    return {"user": user, "emp": emp}


@pytest.mark.django_db
class TestAttendance:
    def test_attendance_me_not_started(self, api_client, user_with_employee):
        api_client.force_authenticate(user=user_with_employee["user"])
        res = api_client.get("/api/v1/attendance/me/")
        assert res.status_code == status.HTTP_200_OK
        data = res.json()
        assert data["status"] == "not_started"
        assert data["clock_in_at"] is None

    def test_clock_in_and_clock_out_flow(self, api_client, user_with_employee):
        api_client.force_authenticate(user=user_with_employee["user"])

        # Clock in
        in_res = api_client.post("/api/v1/attendance/clock-in/", format="json")
        assert in_res.status_code == status.HTTP_200_OK
        assert "clock_in_at" in in_res.json()

        # Duplicate clock in rejected
        dup_res = api_client.post("/api/v1/attendance/clock-in/", format="json")
        assert dup_res.status_code == status.HTTP_400_BAD_REQUEST

        # Today's state should be clocked_in
        me_res = api_client.get("/api/v1/attendance/me/")
        assert me_res.json()["status"] == "clocked_in"

        # Clock out
        out_res = api_client.post("/api/v1/attendance/clock-out/", format="json")
        assert out_res.status_code == status.HTTP_200_OK
        assert "clock_out_at" in out_res.json()

        # Today's state should now be clocked_out
        me_res2 = api_client.get("/api/v1/attendance/me/")
        assert me_res2.json()["status"] == "clocked_out"

    def test_clock_in_assigns_a_department_when_the_employee_has_none(
        self, api_client, user_with_employee
    ):
        expected_department_id = user_with_employee["emp"].department_id
        user_with_employee["emp"].department = None
        user_with_employee["emp"].save(update_fields=["department", "updated_at"])
        api_client.force_authenticate(user=user_with_employee["user"])

        response = api_client.post("/api/v1/attendance/clock-in/", format="json")
        assert response.status_code == status.HTTP_200_OK
        user_with_employee["emp"].refresh_from_db()
        assert user_with_employee["emp"].department_id == expected_department_id

    def test_clock_out_without_clock_in(self, api_client, user_with_employee):
        api_client.force_authenticate(user=user_with_employee["user"])
        res = api_client.post("/api/v1/attendance/clock-out/", format="json")
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_breaks_flow(self, api_client, user_with_employee):
        api_client.force_authenticate(user=user_with_employee["user"])
        # Clock in first
        api_client.post("/api/v1/attendance/clock-in/", format="json")

        # Start break
        start_res = api_client.post("/api/v1/attendance/breaks/start/", format="json")
        assert start_res.status_code == status.HTTP_200_OK

        # Duplicate break start fails
        dup_start = api_client.post("/api/v1/attendance/breaks/start/", format="json")
        assert dup_start.status_code == status.HTTP_400_BAD_REQUEST

        # End break
        end_res = api_client.post("/api/v1/attendance/breaks/end/", format="json")
        assert end_res.status_code == status.HTTP_200_OK
        assert "break_minutes" in end_res.json()

    def test_break_end_without_active_break(self, api_client, user_with_employee):
        api_client.force_authenticate(user=user_with_employee["user"])
        res = api_client.post("/api/v1/attendance/breaks/end/", format="json")
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_attendance_correction_request(self, api_client, user_with_employee):
        from django.utils import timezone

        from apps.approvals.models import Approval

        api_client.force_authenticate(user=user_with_employee["user"])
        today = timezone.now().date()

        res = api_client.post(
            "/api/v1/attendance/corrections/",
            {
                "date": today.isoformat(),
                "requested_clock_in_at": "2026-10-25T09:00:00Z",
                "requested_clock_out_at": "2026-10-25T17:30:00Z",
                "reason": "Forgot badge at home.",
            },
            format="json",
        )
        assert res.status_code == status.HTTP_201_CREATED
        data = res.json()
        assert data["reason"] == "Forgot badge at home."

        # Verify Approval record was created
        assert Approval.objects.filter(type="attendance_correction", subject_id=data["id"]).exists()
