from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import User


class CurrentUserSerializer(serializers.ModelSerializer):
    """
    Serializes current authenticated user matching frontend CurrentUser interface:
    { id, email, first_name, last_name, preferred_name, role, permissions,
      employee_id, job_title, department_id, team_id, manager_id, timezone, avatar_url }
    """

    employee_id = serializers.SerializerMethodField()
    job_title = serializers.SerializerMethodField()
    department_id = serializers.SerializerMethodField()
    team_id = serializers.SerializerMethodField()
    manager_id = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "preferred_name",
            "role",
            "permissions",
            "employee_id",
            "job_title",
            "department_id",
            "team_id",
            "manager_id",
            "timezone",
            "avatar_url",
        ]
        read_only_fields = fields

    def get_employee_id(self, obj) -> str:
        employee = getattr(obj, "employee_profile", None)
        return str(employee.id) if employee else str(obj.id)

    def get_job_title(self, obj) -> str:
        employee = getattr(obj, "employee_profile", None)
        return employee.job_title if employee else ""

    def get_department_id(self, obj) -> str:
        employee = getattr(obj, "employee_profile", None)
        return str(employee.department_id) if (employee and employee.department_id) else ""

    def get_team_id(self, obj) -> str | None:
        employee = getattr(obj, "employee_profile", None)
        return str(employee.team_id) if (employee and employee.team_id) else None

    def get_manager_id(self, obj) -> str | None:
        employee = getattr(obj, "employee_profile", None)
        return str(employee.manager_id) if (employee and employee.manager_id) else None


class LoginRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    remember_me = serializers.BooleanField(required=False, default=False)

    def validate(self, attrs):
        email = attrs.get("email")
        password = attrs.get("password")

        if not email or not password:
            raise serializers.ValidationError("Must include both 'email' and 'password'.")

        user = authenticate(
            request=self.context.get("request"),
            email=email,
            password=password,
        )

        if not user:
            raise serializers.ValidationError({"non_field_errors": ["Invalid credentials."]})

        if not user.is_active:
            raise serializers.ValidationError(
                {"non_field_errors": ["This user account is inactive."]}
            )

        attrs["user"] = user
        return attrs


class TokenRefreshRequestSerializer(serializers.Serializer):
    refresh = serializers.CharField(required=False, allow_blank=True)


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.CharField()
    password = serializers.CharField(min_length=8)


class InviteAcceptSerializer(serializers.Serializer):
    token = serializers.CharField()
    password = serializers.CharField(min_length=8)
    preferred_name = serializers.CharField(required=False, allow_blank=True, allow_null=True)


class RegisterRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    preferred_name = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def validate_email(self, value):
        email = User.objects.normalize_email(value.strip())
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return email

    def validate_password(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages)) from exc
        return value


class MessageResponseSerializer(serializers.Serializer):
    detail = serializers.CharField()
