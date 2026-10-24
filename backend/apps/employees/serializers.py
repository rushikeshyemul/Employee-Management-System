from rest_framework import serializers

from .models import Employee


class EmployeeSerializer(serializers.ModelSerializer):
    user_id = serializers.CharField(source="user.id", allow_null=True, read_only=True)
    department_id = serializers.CharField(source="department.id", allow_null=True, required=False)
    team_id = serializers.CharField(source="team.id", allow_null=True, required=False)
    manager_id = serializers.CharField(source="manager.id", allow_null=True, required=False)

    class Meta:
        model = Employee
        fields = [
            "id",
            "user_id",
            "employee_code",
            "first_name",
            "last_name",
            "preferred_name",
            "email",
            "personal_email",
            "phone",
            "job_title",
            "department_id",
            "team_id",
            "manager_id",
            "location",
            "employment_type",
            "status",
            "start_date",
            "end_date",
            "avatar_url",
            "bio",
            "emergency_contact_name",
            "emergency_contact_phone",
            "salary_band",
            "date_of_birth",
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get("request")

        if request and request.user and request.user.is_authenticated:
            user = request.user
            is_hr = user.role in ("super_admin", "hr_admin") or user.is_superuser
            has_sensitive = is_hr or "employees.view_sensitive" in (user.permissions or [])
            is_self = str(instance.user_id) == str(user.id)

            # Omit salary_band and date_of_birth unless privileged
            if not has_sensitive:
                data.pop("salary_band", None)
                data.pop("date_of_birth", None)

            # Limit personal_email and emergency contact to self or HR
            if not (is_hr or is_self):
                data.pop("personal_email", None)
                data.pop("emergency_contact_name", None)
                data.pop("emergency_contact_phone", None)
        else:
            # Anonymous: strip all private/sensitive fields
            data.pop("salary_band", None)
            data.pop("date_of_birth", None)
            data.pop("personal_email", None)
            data.pop("emergency_contact_name", None)
            data.pop("emergency_contact_phone", None)

        return data


class EmployeeWriteSerializer(serializers.ModelSerializer):
    role = serializers.CharField(required=False, default="employee")
    invite = serializers.BooleanField(required=False, default=False)
    department_id = serializers.CharField(required=True)
    team_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    manager_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)

    class Meta:
        model = Employee
        fields = [
            "first_name",
            "last_name",
            "email",
            "job_title",
            "department_id",
            "team_id",
            "manager_id",
            "location",
            "employment_type",
            "start_date",
            "phone",
            "role",
            "invite",
        ]


class ProfileWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = [
            "preferred_name",
            "phone",
            "bio",
            "personal_email",
            "emergency_contact_name",
            "emergency_contact_phone",
        ]
