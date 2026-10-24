from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.employees.models import Employee
from apps.leave_management.models import LeaveType
from apps.organisations.models import Department


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user_with_employee(db):
    dept = Department.objects.create(name="Product", code="PROD")
    user = User.objects.create_user(email="leave.user@helios.example", password="WorkforceHub1!")
    emp = Employee.objects.create(
        user=user,
        employee_code="EMP-LV",
        first_name="Leave",
        last_name="Tester",
        email="leave.user@helios.example",
        job_title="Product Designer",
        department=dept,
    )
    lt = LeaveType.objects.create(code="annual", name="Annual Leave")
    return {"user": user, "emp": emp, "leave_type": lt}


@pytest.mark.django_db
class TestLeaveManagement:
    def test_leave_balances_initialized(self, api_client, user_with_employee):
        api_client.force_authenticate(user=user_with_employee["user"])
        res = api_client.get("/api/v1/leave/balances/me/")
        assert res.status_code == status.HTTP_200_OK
        data = res.json()
        assert len(data) >= 1
        annual = next(b for b in data if b["code"] == "annual")
        assert annual["allocated_days"] == 20.0
        assert annual["available_days"] == 20.0

    def test_create_and_withdraw_leave_request(self, api_client, user_with_employee):
        user = user_with_employee["user"]
        lt = user_with_employee["leave_type"]
        api_client.force_authenticate(user=user)

        today = timezone.now().date()
        start = today + timedelta(days=5)
        end = today + timedelta(days=7)

        # Submit request
        res = api_client.post(
            "/api/v1/leave/requests/",
            {
                "leave_type_id": lt.id,
                "start_date": start.isoformat(),
                "end_date": end.isoformat(),
                "partial_day": "none",
                "reason": "Family vacation",
            },
            format="json",
        )
        assert res.status_code == status.HTTP_201_CREATED
        req_id = res.json()["id"]

        # Balances should show pending days deducted from available
        bal_res = api_client.get("/api/v1/leave/balances/me/")
        annual = next(b for b in bal_res.json() if b["code"] == "annual")
        assert annual["pending_days"] == 3.0
        assert annual["available_days"] == 17.0

        # Withdraw request
        withdraw_res = api_client.post(f"/api/v1/leave/requests/{req_id}/withdraw/")
        assert withdraw_res.status_code == status.HTTP_200_OK
        assert withdraw_res.json()["status"] == "withdrawn"

        # Balance restored
        bal_res2 = api_client.get("/api/v1/leave/balances/me/")
        annual2 = next(b for b in bal_res2.json() if b["code"] == "annual")
        assert annual2["pending_days"] == 0.0
        assert annual2["available_days"] == 20.0

    def test_leave_request_end_date_before_start_date(self, api_client, user_with_employee):
        user = user_with_employee["user"]
        lt = user_with_employee["leave_type"]
        api_client.force_authenticate(user=user)

        today = timezone.now().date()
        res = api_client.post(
            "/api/v1/leave/requests/",
            {
                "leave_type_id": lt.id,
                "start_date": (today + timedelta(days=10)).isoformat(),
                "end_date": (today + timedelta(days=5)).isoformat(),
                "partial_day": "none",
                "reason": "Invalid dates",
            },
            format="json",
        )
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_leave_request_insufficient_balance(self, api_client, user_with_employee):
        user = user_with_employee["user"]
        lt = user_with_employee["leave_type"]
        api_client.force_authenticate(user=user)

        today = timezone.now().date()
        # Requesting 40 days when 20 are allocated
        res = api_client.post(
            "/api/v1/leave/requests/",
            {
                "leave_type_id": lt.id,
                "start_date": (today + timedelta(days=1)).isoformat(),
                "end_date": (today + timedelta(days=40)).isoformat(),
                "partial_day": "none",
                "reason": "Too long",
            },
            format="json",
        )
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_leave_request_overlapping_dates(self, api_client, user_with_employee):
        user = user_with_employee["user"]
        lt = user_with_employee["leave_type"]
        api_client.force_authenticate(user=user)

        today = timezone.now().date()
        start = today + timedelta(days=10)
        end = today + timedelta(days=14)

        # First request succeeds
        res1 = api_client.post(
            "/api/v1/leave/requests/",
            {
                "leave_type_id": lt.id,
                "start_date": start.isoformat(),
                "end_date": end.isoformat(),
                "partial_day": "none",
                "reason": "First request",
            },
            format="json",
        )
        assert res1.status_code == status.HTTP_201_CREATED

        # Second overlapping request fails
        res2 = api_client.post(
            "/api/v1/leave/requests/",
            {
                "leave_type_id": lt.id,
                "start_date": (start + timedelta(days=1)).isoformat(),
                "end_date": (end + timedelta(days=2)).isoformat(),
                "partial_day": "none",
                "reason": "Overlapping request",
            },
            format="json",
        )
        assert res2.status_code == status.HTTP_400_BAD_REQUEST

    def test_cancel_approved_leave_request(self, api_client, user_with_employee):
        from apps.leave_management.models import LeaveBalance, LeaveRequest

        user = user_with_employee["user"]
        emp = user_with_employee["emp"]
        lt = user_with_employee["leave_type"]
        api_client.force_authenticate(user=user)

        today = timezone.now().date()
        bal, _ = LeaveBalance.objects.get_or_create(
            employee=emp, leave_type=lt, defaults={"allocated_days": 20.0, "used_days": 3.0}
        )
        bal.used_days = 3.0
        bal.save()

        req = LeaveRequest.objects.create(
            employee=emp,
            department=emp.department,
            leave_type=lt,
            start_date=today + timedelta(days=20),
            end_date=today + timedelta(days=22),
            days=3.0,
            status="approved",
            reason="Trip cancelled",
        )

        res = api_client.post(f"/api/v1/leave/requests/{req.id}/cancel/")
        assert res.status_code == status.HTTP_200_OK
        assert res.json()["status"] == "cancelled"

        bal.refresh_from_db()
        assert bal.used_days == 0.0
