import uuid

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models

from .managers import UserManager

ROLE_CHOICES = (
    ("super_admin", "Super Admin"),
    ("hr_admin", "HR Admin"),
    ("manager", "Manager"),
    ("project_manager", "Project Manager"),
    ("employee", "Employee"),
    ("auditor", "Auditor"),
)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom user model utilizing email for authentication, supporting role-based
    and fine-grained permission attributes matching the frontend interface.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, db_index=True)
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    preferred_name = models.CharField(max_length=150, blank=True, null=True)
    role = models.CharField(max_length=50, choices=ROLE_CHOICES, default="employee", db_index=True)
    permissions = models.JSONField(default=list, blank=True)
    timezone = models.CharField(max_length=50, default="UTC")
    avatar_url = models.URLField(max_length=500, blank=True, null=True)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    class Meta:
        verbose_name = "User"
        verbose_name_plural = "Users"
        ordering = ["-date_joined"]

    def __str__(self):
        return self.email

    @property
    def full_name(self):
        parts = [self.first_name, self.last_name]
        return " ".join(p for p in parts if p).strip() or self.email
