from rest_framework import permissions


class IsSuperAdmin(permissions.BasePermission):
    """Allows access only to super_admin users or Django superusers."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.role == "super_admin" or request.user.is_superuser)
        )


class IsHRAdmin(permissions.BasePermission):
    """Allows access to hr_admin or super_admin users."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.role in ("super_admin", "hr_admin") or request.user.is_superuser)
        )


class HasRequiredPermission(permissions.BasePermission):
    """
    Checks if requesting user has an explicit permission string in their permissions list,
    or has super_admin role.
    """

    required_permission = None

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False

        if request.user.role == "super_admin" or request.user.is_superuser:
            return True

        perm = getattr(view, "required_permission", self.required_permission)
        if not perm:
            return True

        user_perms = getattr(request.user, "permissions", []) or []
        return perm in user_perms
