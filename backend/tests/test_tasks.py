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
def setup_task_data(db):
    dept = Department.objects.create(name="Engineering", code="ENG")
    user = User.objects.create_user(email="dev@helios.example", password="WorkforceHub1!")
    emp = Employee.objects.create(
        user=user,
        employee_code="EMP-DEV",
        first_name="Dev",
        last_name="User",
        email="dev@helios.example",
        job_title="Software Engineer",
        department=dept,
    )
    proj = Project.objects.create(
        key="PRJ-HUB", name="Hub Platform", department=dept, status="active"
    )
    return {"user": user, "emp": emp, "project": proj, "dept": dept}


@pytest.mark.django_db
class TestTasks:
    def test_create_task(self, api_client, setup_task_data):
        user = setup_task_data["user"]
        emp = setup_task_data["emp"]
        proj = setup_task_data["project"]
        api_client.force_authenticate(user=user)

        response = api_client.post(
            "/api/v1/tasks/",
            {
                "title": "Build Auth Layer",
                "description": "Implement DRF SimpleJWT",
                "project_id": proj.id,
                "assignee_id": emp.id,
                "priority": "high",
                "status": "todo",
            },
            format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["title"] == "Build Auth Layer"
        assert data["key"] == "PRJ-HUB-1"
        assert data["status"] == "todo"

    def test_task_transition_workflow(self, api_client, setup_task_data):
        user = setup_task_data["user"]
        emp = setup_task_data["emp"]
        proj = setup_task_data["project"]
        api_client.force_authenticate(user=user)

        task = Task.objects.create(
            key="PRJ-HUB-1",
            title="Setup pipeline",
            project=proj,
            department=proj.department,
            assignee=emp,
            reporter=emp,
            status="todo",
        )

        # Transition: todo -> in_progress (action: 'start')
        res1 = api_client.post(
            f"/api/v1/tasks/{task.id}/transitions/",
            {"action": "start"},
            format="json",
        )
        assert res1.status_code == status.HTTP_200_OK
        assert res1.json()["status"] == "in_progress"

        # Transition: in_progress -> in_review (action: 'submit_for_review')
        res2 = api_client.post(
            f"/api/v1/tasks/{task.id}/transitions/",
            {"action": "submit_for_review"},
            format="json",
        )
        assert res2.status_code == status.HTTP_200_OK
        assert res2.json()["status"] == "in_review"

        # Invalid transition from in_review directly to start
        res_invalid = api_client.post(
            f"/api/v1/tasks/{task.id}/transitions/",
            {"action": "start"},
            format="json",
        )
        assert res_invalid.status_code == status.HTTP_400_BAD_REQUEST

    def test_task_comments(self, api_client, setup_task_data):
        user = setup_task_data["user"]
        emp = setup_task_data["emp"]
        proj = setup_task_data["project"]
        api_client.force_authenticate(user=user)

        task = Task.objects.create(
            key="PRJ-HUB-2",
            title="Database schemas",
            project=proj,
            department=proj.department,
            assignee=emp,
            reporter=emp,
            status="todo",
        )

        res = api_client.post(
            f"/api/v1/tasks/{task.id}/comments/",
            {"body": "Initial schema migration completed."},
            format="json",
        )
        assert res.status_code == status.HTTP_201_CREATED
        assert res.json()["body"] == "Initial schema migration completed."

        get_res = api_client.get(f"/api/v1/tasks/{task.id}/comments/")
        assert get_res.status_code == status.HTTP_200_OK
        assert len(get_res.json()) == 1

    def test_task_blocking_and_unblocking(self, api_client, setup_task_data):
        user = setup_task_data["user"]
        emp = setup_task_data["emp"]
        proj = setup_task_data["project"]
        api_client.force_authenticate(user=user)

        task = Task.objects.create(
            key="PRJ-HUB-3",
            title="External API integration",
            project=proj,
            department=proj.department,
            assignee=emp,
            reporter=emp,
            status="in_progress",
        )

        # Block without reason fails
        res_no_reason = api_client.post(
            f"/api/v1/tasks/{task.id}/transitions/",
            {"action": "block"},
            format="json",
        )
        assert res_no_reason.status_code == status.HTTP_400_BAD_REQUEST

        # Block with reason succeeds
        res_blocked = api_client.post(
            f"/api/v1/tasks/{task.id}/transitions/",
            {"action": "block", "reason": "Waiting for third-party client credentials."},
            format="json",
        )
        assert res_blocked.status_code == status.HTTP_200_OK
        assert res_blocked.json()["status"] == "blocked"
        assert res_blocked.json()["block_reason"] == "Waiting for third-party client credentials."

        # Unblock restores to previous state (in_progress)
        res_unblock = api_client.post(
            f"/api/v1/tasks/{task.id}/transitions/",
            {"action": "unblock"},
            format="json",
        )
        assert res_unblock.status_code == status.HTTP_200_OK
        assert res_unblock.json()["status"] == "in_progress"

    def test_workflow_definition_endpoint(self, api_client, setup_task_data):
        user = setup_task_data["user"]
        api_client.force_authenticate(user=user)
        res = api_client.get("/api/v1/tasks/workflow-definition/")
        assert res.status_code == status.HTTP_200_OK
        data = res.json()
        assert "statuses" in data
        assert "actions" in data

    def test_task_list_and_filter(self, api_client, setup_task_data):
        user = setup_task_data["user"]
        emp = setup_task_data["emp"]
        proj = setup_task_data["project"]
        api_client.force_authenticate(user=user)

        Task.objects.create(
            key="PRJ-HUB-4",
            title="Audit security",
            project=proj,
            department=proj.department,
            assignee=emp,
            reporter=emp,
            priority="urgent",
            status="todo",
        )

        res = api_client.get("/api/v1/tasks/?priority=urgent")
        assert res.status_code == status.HTTP_200_OK
        assert res.json()["count"] >= 1
