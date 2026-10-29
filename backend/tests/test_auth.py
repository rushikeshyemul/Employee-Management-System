import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.employees.models import Employee


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def create_user(db):
    def _create_user(
        email="employee@helios.example", password="WorkforceHub1!", role="employee", **kwargs
    ):
        return User.objects.create_user(email=email, password=password, role=role, **kwargs)

    return _create_user


@pytest.mark.django_db
class TestAuthentication:
    def test_valid_login(self, api_client, create_user):
        create_user(email="test.emp@helios.example", password="SecretPassword123!")
        url = reverse("accounts:login")
        response = api_client.post(
            url,
            {"email": "test.emp@helios.example", "password": "SecretPassword123!"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "user" in data
        assert data["user"]["email"] == "test.emp@helios.example"
        assert "access" in data
        assert "refresh" in data
        # Check cookies
        assert "wf_access" in response.cookies
        assert "wf_refresh" in response.cookies

    def test_invalid_credentials(self, api_client, create_user):
        create_user(email="test.emp@helios.example", password="SecretPassword123!")
        url = reverse("accounts:login")
        response = api_client.post(
            url,
            {"email": "test.emp@helios.example", "password": "WrongPassword!"},
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_inactive_user_cannot_login(self, api_client, create_user):
        create_user(email="inactive@helios.example", password="SecretPassword123!", is_active=False)
        url = reverse("accounts:login")
        response = api_client.post(
            url,
            {"email": "inactive@helios.example", "password": "SecretPassword123!"},
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_current_user_authenticated(self, api_client, create_user):
        user = create_user(email="me@helios.example", first_name="Alex", last_name="Rivera")
        api_client.force_authenticate(user=user)
        url = reverse("accounts:me")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["email"] == "me@helios.example"
        assert data["first_name"] == "Alex"
        assert data["last_name"] == "Rivera"

    def test_current_user_unauthenticated(self, api_client):
        url = reverse("accounts:me")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_token_refresh(self, api_client, create_user):
        create_user(email="refresh@helios.example", password="SecretPassword123!")
        login_res = api_client.post(
            reverse("accounts:login"),
            {"email": "refresh@helios.example", "password": "SecretPassword123!"},
            format="json",
        )
        refresh_token = login_res.json()["refresh"]

        url = reverse("accounts:token-refresh")
        refresh_res = api_client.post(url, {"refresh": refresh_token}, format="json")
        assert refresh_res.status_code == status.HTTP_200_OK
        assert "access" in refresh_res.json()

    def test_logout_clears_cookies(self, api_client, create_user):
        user = create_user(email="logout@helios.example", password="SecretPassword123!")
        api_client.force_authenticate(user=user)
        url = reverse("accounts:logout")
        response = api_client.post(url, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.cookies["wf_access"].value == ""

    def test_password_reset_request(self, api_client, create_user):
        create_user(email="reset.emp@helios.example", password="SecretPassword123!")
        url = reverse("accounts:password-reset")
        response = api_client.post(url, {"email": "reset.emp@helios.example"}, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert "detail" in response.json()

    def test_password_reset_confirm_validation_and_success(self, api_client):
        url = reverse("accounts:password-reset-confirm")
        # Fails with password shorter than 8 chars
        fail_res = api_client.post(
            url,
            {"token": "valid_token", "password": "short"},
            format="json",
        )
        assert fail_res.status_code == status.HTTP_400_BAD_REQUEST

        # Succeeds with valid token & password
        ok_res = api_client.post(
            url,
            {"token": "valid_token", "password": "NewSecurePassword123!"},
            format="json",
        )
        assert ok_res.status_code == status.HTTP_200_OK
        assert "detail" in ok_res.json()

    def test_invite_accept_validation_and_success(self, api_client):
        url = reverse("accounts:invite-accept")
        # Fails with password shorter than 8 chars
        fail_res = api_client.post(
            url,
            {"token": "valid_invite_token", "password": "short"},
            format="json",
        )
        assert fail_res.status_code == status.HTTP_400_BAD_REQUEST

        # Succeeds with valid payload
        ok_res = api_client.post(
            url,
            {
                "token": "valid_invite_token",
                "password": "NewSecurePassword123!",
                "preferred_name": "Alex",
            },
            format="json",
        )
        assert ok_res.status_code == status.HTTP_200_OK
        assert "detail" in ok_res.json()

    def test_register_creates_employee_and_signs_in(self, api_client):
        url = reverse("accounts:register")
        response = api_client.post(
            url,
            {
                "email": "new.hire@helios.example",
                "password": "NewHirePassword1!",
                "first_name": "New",
                "last_name": "Hire",
                "preferred_name": "New",
            },
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["user"]["email"] == "new.hire@helios.example"
        assert data["user"]["role"] == "employee"
        assert "attendance.clock" in data["user"]["permissions"]
        assert data["user"]["employee_id"]
        assert "access" in data
        assert "wf_access" in response.cookies
        assert Employee.objects.filter(email="new.hire@helios.example", status="active").exists()

        duplicate = api_client.post(
            url,
            {
                "email": "new.hire@helios.example",
                "password": "NewHirePassword1!",
                "first_name": "New",
                "last_name": "Hire",
            },
            format="json",
        )
        assert duplicate.status_code == status.HTTP_400_BAD_REQUEST

    def test_bearer_header_authentication(self, api_client, create_user):
        create_user(email="bearer@helios.example", password="SecretPassword123!")
        login_res = api_client.post(
            reverse("accounts:login"),
            {"email": "bearer@helios.example", "password": "SecretPassword123!"},
            format="json",
        )
        access_token = login_res.json()["access"]

        # Call authenticated endpoint with Bearer header
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        me_res = api_client.get(reverse("accounts:me"))
        assert me_res.status_code == status.HTTP_200_OK
        assert me_res.json()["email"] == "bearer@helios.example"
