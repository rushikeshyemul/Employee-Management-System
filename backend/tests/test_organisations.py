import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.organisations.models import Department, Project, Team


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def hr_user(db):
    return User.objects.create_user(
        email="hr@helios.example",
        password="WorkforceHub1!",
        role="hr_admin",
        permissions=["departments.view", "departments.manage", "projects.view"],
    )


@pytest.fixture
def employee_user(db):
    return User.objects.create_user(
        email="dev@helios.example",
        password="WorkforceHub1!",
        role="employee",
        permissions=["departments.view", "projects.view"],
    )


@pytest.mark.django_db
class TestOrganisations:
    def test_list_departments(self, api_client, employee_user):
        Department.objects.create(name="Engineering", code="ENG", description="Tech team")
        api_client.force_authenticate(user=employee_user)

        response = api_client.get("/api/v1/departments/")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["count"] == 1
        assert data["results"][0]["code"] == "ENG"

    def test_create_team(self, api_client, hr_user):
        dept = Department.objects.create(name="Product", code="PROD")
        api_client.force_authenticate(user=hr_user)

        response = api_client.post(
            "/api/v1/teams/",
            {"name": "Core UX", "department_id": dept.id, "description": "Design & UX"},
            format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert Team.objects.filter(name="Core UX").exists()

    def test_list_projects(self, api_client, employee_user):
        dept = Department.objects.create(name="Operations", code="OPS")
        Project.objects.create(
            key="PRJ-OPS",
            name="Cloud Migration",
            department=dept,
            status="active",
        )
        api_client.force_authenticate(user=employee_user)

        response = api_client.get("/api/v1/projects/")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["count"] == 1
        assert data["results"][0]["key"] == "PRJ-OPS"

    def test_organisation_settings_retrieve_and_patch(self, api_client, hr_user, employee_user):
        api_client.force_authenticate(user=employee_user)
        get_res = api_client.get("/api/v1/organisation/settings/")
        assert get_res.status_code == status.HTTP_200_OK

        # Standard employee cannot patch settings
        patch_res_forbidden = api_client.patch(
            "/api/v1/organisation/settings/",
            {"standard_start": "09:30"},
            format="json",
        )
        assert patch_res_forbidden.status_code == status.HTTP_403_FORBIDDEN

        # HR user can patch settings
        api_client.force_authenticate(user=hr_user)
        patch_res = api_client.patch(
            "/api/v1/organisation/settings/",
            {"standard_start": "09:30"},
            format="json",
        )
        assert patch_res.status_code == status.HTTP_200_OK
        assert patch_res.json()["standard_start"] == "09:30"

    def test_department_detail(self, api_client, employee_user):
        dept = Department.objects.create(
            name="Human Resources", code="HR", description="People team"
        )
        api_client.force_authenticate(user=employee_user)
        res = api_client.get(f"/api/v1/departments/{dept.id}/")
        assert res.status_code == status.HTTP_200_OK
        assert res.json()["name"] == "Human Resources"

    def test_project_detail(self, api_client, employee_user):
        dept = Department.objects.create(name="Growth", code="GROWTH")
        proj = Project.objects.create(
            key="PRJ-GROWTH",
            name="Q4 Marketing Campaign",
            department=dept,
            status="planned",
        )
        api_client.force_authenticate(user=employee_user)
        res = api_client.get(f"/api/v1/projects/{proj.id}/")
        assert res.status_code == status.HTTP_200_OK
        assert res.json()["name"] == "Q4 Marketing Campaign"
