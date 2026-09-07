from functools import wraps
from django.core.exceptions import PermissionDenied
from django.contrib.auth.views import redirect_to_login
from rest_framework.permissions import BasePermission
from accounts.models import Role


# --------------------------------------------------------------------------
# View-Level Security Decorators (Django Templates & Standard Views)
# --------------------------------------------------------------------------

def admin_required(view_func):
    """
    Ensures the user is authenticated and possesses the ADMIN role (or superuser).
    Raises PermissionDenied (HTTP 403) if authorized user lacks Admin role.
    """
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect_to_login(request.get_full_path())
        if not (request.user.is_superuser or (hasattr(request.user, 'profile') and request.user.profile.is_admin)):
            raise PermissionDenied("You do not have administrative privileges to access this resource.")
        return view_func(request, *args, **kwargs)
    return _wrapped_view


def team_member_required(view_func):
    """
    Ensures the user is authenticated and possesses the TEAM_MEMBER role.
    Raises PermissionDenied (HTTP 403) if authorized user is not a Team Member.
    """
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect_to_login(request.get_full_path())
        if not (hasattr(request.user, 'profile') and request.user.profile.is_team_member):
            raise PermissionDenied("You do not have team member privileges to access this resource.")
        return view_func(request, *args, **kwargs)
    return _wrapped_view


# --------------------------------------------------------------------------
# DRF API-Level Permission Classes
# --------------------------------------------------------------------------

class IsAdminRole(BasePermission):
    """
    Custom DRF permission: Allows access only to authenticated users with ADMIN role.
    """
    message = "You do not have administrative privileges to perform this action."

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.is_superuser or (hasattr(request.user, 'profile') and request.user.profile.is_admin))
        )


class IsTeamMemberRole(BasePermission):
    """
    Custom DRF permission: Allows access only to authenticated users with TEAM_MEMBER role.
    """
    message = "You do not have team member privileges to perform this action."

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'profile') and
            request.user.profile.is_team_member
        )
