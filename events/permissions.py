from functools import wraps
from django.shortcuts import get_object_or_404
from django.core.exceptions import PermissionDenied
from rest_framework.permissions import BasePermission, SAFE_METHODS
from events.models import Event
from events.services import EventService


# --------------------------------------------------------------------------
# Django View Decorators
# --------------------------------------------------------------------------

def event_access_required(view_func):
    """
    View decorator ensuring the user is authenticated and has permission to access
    the specified event (either Admin or assigned Team Member).
    Expects 'event_id' in URL keyword arguments.
    """
    @wraps(view_func)
    def _wrapped_view(request, event_id, *args, **kwargs):
        event = get_object_or_404(Event, id=event_id)
        if not EventService.can_user_access_event(request.user, event):
            raise PermissionDenied("You are not authorized to access this event.")
        request.event = event
        return view_func(request, event_id=event_id, *args, **kwargs)
    return _wrapped_view


def event_manage_required(view_func):
    """
    View decorator ensuring the user has Admin rights to modify the specified event.
    """
    @wraps(view_func)
    def _wrapped_view(request, event_id, *args, **kwargs):
        event = get_object_or_404(Event, id=event_id)
        if not EventService.can_user_manage_event(request.user, event):
            raise PermissionDenied("You do not have administrative privileges to manage this event.")
        request.event = event
        return view_func(request, event_id=event_id, *args, **kwargs)
    return _wrapped_view


# --------------------------------------------------------------------------
# DRF Object-Level Permissions
# --------------------------------------------------------------------------

class IsEventMemberOrAdmin(BasePermission):
    """
    DRF Permission:
    - Admins can perform any action.
    - Assigned Team Members can perform SAFE_METHODS (GET, HEAD, OPTIONS).
    - Unassigned users are denied.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        event = obj if isinstance(obj, Event) else getattr(obj, 'event', None)
        if not event:
            return False

        if EventService.can_user_manage_event(request.user, event):
            return True

        if request.method in SAFE_METHODS:
            return EventService.can_user_access_event(request.user, event)

        return False


class IsEventAdmin(BasePermission):
    """
    DRF Permission: Allows access strictly to administrators who can manage the event.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.is_superuser or (hasattr(request.user, 'profile') and request.user.profile.is_admin))
        )

    def has_object_permission(self, request, view, obj):
        event = obj if isinstance(obj, Event) else getattr(obj, 'event', None)
        if not event:
            return False
        return EventService.can_user_manage_event(request.user, event)
