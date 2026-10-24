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
def hr_user(db):
    return User.objects.create_user(
        email="hr.admin@helios.example",
        password="WorkforceHub1!",
        role="hr_admin",
        permissions=[
            "employees.view",
            "employees.manage",
            "employees.deactivate",
            "employees.view_sensitive",
        ],
    )


@pytest.fixture
def standard_employee_user(db):
    return User.objects.create_user(
        email="standard.emp@helios.example",
        password="WorkforceHub1!",
        role="employee",
        permissions=["employees.view"],
    )


@pytest.fixture
def sample_employee(db):
    dept = Department.objects.create(name="Engineering", code="ENG")
    user = User.objects.create_user(
        email="john.doe@helios.example",
        password="WorkforceHub1!",
        first_name="John",
        last_name="Doe",
    )
    return Employee.objects.create(
        user=user,
        employee_code="EMP-1001",
        first_name="John",
        last_name="Doe",
        email="john.doe@helios.example",
        personal_email="john.personal@example.com",
        job_title="Software Engineer",
        department=dept,
        salary_band="Band-4",
        date_of_birth="1990-05-15",
    )


@pytest.mark.django_db
class TestEmployees:
    def test_sensitive_fields_hidden_for_standard_employee(
        self, api_client, standard_employee_user, sample_employee
    ):
        api_client.force_authenticate(user=standard_employee_user)
        response = api_client.get(f"/api/v1/employees/{sample_employee.id}/")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["first_name"] == "John"
        # Sensitive fields must be omitted
        assert "salary_band" not in data
        assert "date_of_birth" not in data
        assert "personal_email" not in data

    def test_sensitive_fields_visible_for_hr_admin(self, api_client, hr_user, sample_employee):
        api_client.force_authenticate(user=hr_user)
        response = api_client.get(f"/api/v1/employees/{sample_employee.id}/")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["salary_band"] == "Band-4"
        assert data["date_of_birth"] == "1990-05-15"
        assert data["personal_email"] == "john.personal@example.com"

    def test_create_employee_requires_hr_permission(self, api_client, standard_employee_user):
        dept = Department.objects.create(name="Finance", code="FIN")
        api_client.force_authenticate(user=standard_employee_user)

        response = api_client.post(
            "/api/v1/employees/",
            {
                "first_name": "Jane",
                "last_name": "Smith",
                "email": "jane.smith@helios.example",
                "job_title": "Accountant",
                "department_id": dept.id,
                "employment_type": "full_time",
                "start_date": "2026-01-10",
                "role": "employee",
            },
            format="json",
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_deactivate_employee(self, api_client, hr_user, sample_employee):
        api_client.force_authenticate(user=hr_user)
        response = api_client.post(f"/api/v1/employees/{sample_employee.id}/deactivate/")

        assert response.status_code == status.HTTP_200_OK
        sample_employee.refresh_from_db()
        assert sample_employee.status == "inactive"
        assert sample_employee.user.is_active is False

    def test_update_employee_by_hr(self, api_client, hr_user, sample_employee):
        api_client.force_authenticate(user=hr_user)
        response = api_client.patch(
            f"/api/v1/employees/{sample_employee.id}/",
            {"job_title": "Lead Software Engineer", "salary_band": "Band-5"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["job_title"] == "Lead Software Engineer"
        assert data["salary_band"] == "Band-5"

    def test_employees_me_retrieve_and_patch(self, api_client, sample_employee):
        api_client.force_authenticate(user=sample_employee.user)
        me_res = api_client.get("/api/v1/employees/me/")
        assert me_res.status_code == status.HTTP_200_OK
        assert me_res.json()["email"] == sample_employee.email

        patch_res = api_client.patch(
            "/api/v1/employees/me/",
            {"bio": "Passionate engineer and mentor."},
            format="json",
        )
        assert patch_res.status_code == status.HTTP_200_OK
        assert patch_res.json()["bio"] == "Passionate engineer and mentor."

    def test_filter_employees_by_department(self, api_client, hr_user, sample_employee):
        api_client.force_authenticate(user=hr_user)
        res = api_client.get(f"/api/v1/employees/?department_id={sample_employee.department.id}")
        assert res.status_code == status.HTTP_200_OK
        assert res.json()["count"] >= 1
