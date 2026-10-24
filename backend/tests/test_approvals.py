from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.approvals.models import Approval
from apps.employees.models import Employee
from apps.leave_management.models import LeaveBalance, LeaveRequest, LeaveType
from apps.organisations.models import Department


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def approval_setup(db):
    dept = Department.objects.create(name="Engineering", code="ENG")
    manager_user = User.objects.create_user(
        email="mgr@helios.example", password="WorkforceHub1!", role="manager"
    )
    manager = Employee.objects.create(
        user=manager_user,
        employee_code="EMP-MGR",
        first_name="Alice",
        last_name="Manager",
        email="mgr@helios.example",
        job_title="Engineering Manager",
        department=dept,
    )
    emp_user = User.objects.create_user(
        email="dev@helios.example", password="WorkforceHub1!", role="employee"
    )
    emp = Employee.objects.create(
        user=emp_user,
        employee_code="EMP-DEV",
        first_name="Bob",
        last_name="Developer",
        email="dev@helios.example",
        job_title="Engineer",
        department=dept,
        manager=manager,
    )
    lt = LeaveType.objects.create(code="annual", name="Annual Leave")
    balance = LeaveBalance.objects.create(
        employee=emp, leave_type=lt, allocated_days=20.0, used_days=0.0, pending_days=2.0
    )
    today = timezone.now().date()
    leave_req = LeaveRequest.objects.create(
        employee=emp,
        department=dept,
        leave_type=lt,
        start_date=today + timedelta(days=2),
        end_date=today + timedelta(days=3),
        days=2.0,
        reason="Short trip",
        status="pending",
    )
    appr = Approval.objects.create(
        type="leave",
        subject_id=leave_req.id,
        employee=emp,
        approver=manager,
        title=f"Leave Request: {emp.display_name}",
        summary="Annual leave for 2 days",
        status="pending",
    )
    return {
        "manager_user": manager_user,
        "manager": manager,
        "emp": emp,
        "leave_req": leave_req,
        "balance": balance,
        "approval": appr,
    }


@pytest.mark.django_db
class TestApprovals:
    def test_approve_leave_request(self, api_client, approval_setup):
        manager_user = approval_setup["manager_user"]
        appr = approval_setup["approval"]
        leave_req = approval_setup["leave_req"]
        balance = approval_setup["balance"]

        api_client.force_authenticate(user=manager_user)
        res = api_client.post(
            f"/api/v1/approvals/{appr.id}/decision/",
            {"decision": "approve", "comment": "Have fun!"},
            format="json",
        )
        assert res.status_code == status.HTTP_200_OK
        assert res.json()["status"] == "approved"

        # Check LeaveRequest synchronized
        leave_req.refresh_from_db()
        assert leave_req.status == "approved"

        # Check balance: pending converted to used
        balance.refresh_from_db()
        assert balance.pending_days == 0.0
        assert balance.used_days == 2.0

        # Duplicate decision on finalized approval returns 409 Conflict
        dup_res = api_client.post(
            f"/api/v1/approvals/{appr.id}/decision/",
            {"decision": "approve"},
            format="json",
        )
        assert dup_res.status_code == status.HTTP_409_CONFLICT

    def test_reject_leave_request(self, api_client, approval_setup):
        manager_user = approval_setup["manager_user"]
        appr = approval_setup["approval"]
        leave_req = approval_setup["leave_req"]
        balance = approval_setup["balance"]

        api_client.force_authenticate(user=manager_user)
        res = api_client.post(
            f"/api/v1/approvals/{appr.id}/decision/",
            {"decision": "reject", "comment": "Conflict with critical sprint deadline."},
            format="json",
        )
        assert res.status_code == status.HTTP_200_OK
        assert res.json()["status"] == "rejected"

        leave_req.refresh_from_db()
        assert leave_req.status == "rejected"

        # Balance refunded: pending days removed, used remains 0
        balance.refresh_from_db()
        assert balance.pending_days == 0.0
        assert balance.used_days == 0.0

    def test_request_changes_decision(self, api_client, approval_setup):
        manager_user = approval_setup["manager_user"]
        appr = approval_setup["approval"]

        api_client.force_authenticate(user=manager_user)
        res = api_client.post(
            f"/api/v1/approvals/{appr.id}/decision/",
            {"decision": "request_changes", "comment": "Please shift dates by one week."},
            format="json",
        )
        assert res.status_code == status.HTTP_200_OK
        assert res.json()["status"] == "changes_requested"

    def test_unauthorized_user_cannot_decide_approval(self, api_client, approval_setup):
        appr = approval_setup["approval"]
        other_user = User.objects.create_user(
            email="other.person@helios.example", password="WorkforceHub1!", role="employee"
        )
        api_client.force_authenticate(user=other_user)

        res = api_client.post(
            f"/api/v1/approvals/{appr.id}/decision/",
            {"decision": "approve"},
            format="json",
        )
        assert res.status_code == status.HTTP_403_FORBIDDEN

    def test_approvals_inbox_filtering(self, api_client, approval_setup):
        manager_user = approval_setup["manager_user"]
        api_client.force_authenticate(user=manager_user)

        res = api_client.get("/api/v1/approvals/inbox/?type=leave")
        assert res.status_code == status.HTTP_200_OK
        data = res.json()
        assert data["count"] >= 1
        assert data["results"][0]["type"] == "leave"
