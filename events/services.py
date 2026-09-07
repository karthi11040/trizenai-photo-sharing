import logging
from typing import Optional
from django.db import transaction
from django.db.models import QuerySet
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError, PermissionDenied
from events.models import Event, EventMembership
from accounts.models import Role

logger = logging.getLogger(__name__)


class EventService:
    @staticmethod
    def get_visible_events_for_user(user: User) -> QuerySet[Event]:
        """
        Admins can view all events they created or administer.
        Team Members can ONLY view events where they have an active EventMembership.
        """
        if not user or not user.is_authenticated:
            return Event.objects.none()

        if user.is_superuser or (hasattr(user, 'profile') and user.profile.is_admin):
            return Event.objects.all().select_related('created_by')

        # Team member: Filter only to assigned events
        return Event.objects.filter(memberships__user=user).select_related('created_by')

    @staticmethod
    def can_user_access_event(user: User, event: Event) -> bool:
        """
        Returns True if user has read access to the event:
        - Admin: Yes (all events)
        - Team Member: Yes IF they are an assigned member of this specific event.
        """
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser or (hasattr(user, 'profile') and user.profile.is_admin):
            return True
        return event.memberships.filter(user=user).exists()

    @staticmethod
    def can_user_manage_event(user: User, event: Event) -> bool:
        """
        Only Administrators can manage (edit, delete, add members to) an event.
        """
        if not user or not user.is_authenticated:
            return False
        return bool(user.is_superuser or (hasattr(user, 'profile') and user.profile.is_admin))

    @classmethod
    @transaction.atomic
    def create_event(
        cls,
        name: str,
        event_date,
        created_by: User,
        description: str = '',
        location: str = ''
    ) -> Event:
        """
        Creates an event. Only Admins can invoke this service.
        """
        if not (created_by.is_superuser or (hasattr(created_by, 'profile') and created_by.profile.is_admin)):
            raise PermissionDenied("Only administrators can create events.")

        event = Event.objects.create(
            name=name.strip(),
            event_date=event_date,
            created_by=created_by,
            description=description.strip(),
            location=location.strip()
        )
        logger.info("Event created: '%s' (ID: %d) by %s", event.name, event.id, created_by.username)
        return event

    @classmethod
    @transaction.atomic
    def add_team_member(cls, event: Event, user: User, acting_user: User) -> EventMembership:
        """
        Adds a team member to an event.
        Validates acting user permissions and ensures no duplicate memberships.
        """
        if not cls.can_user_manage_event(acting_user, event):
            raise PermissionDenied("Only administrators can assign team members to events.")

        # Ensure user has TEAM_MEMBER role
        if hasattr(user, 'profile') and user.profile.is_admin and not user.is_superuser:
            logger.debug("Adding user with role %s to event %d", user.profile.role, event.id)

        membership, created = EventMembership.objects.get_or_create(event=event, user=user)
        if not created:
            raise ValidationError(f"User '{user.username}' is already assigned to this event.")

        logger.info("Assigned user %s to event '%s' (ID: %d)", user.username, event.name, event.id)
        return membership

    @classmethod
    @transaction.atomic
    def remove_team_member(cls, event: Event, user: User, acting_user: User) -> bool:
        """
        Removes a team member from an event.
        """
        if not cls.can_user_manage_event(acting_user, event):
            raise PermissionDenied("Only administrators can remove team members from events.")

        deleted_count, _ = EventMembership.objects.filter(event=event, user=user).delete()
        if deleted_count > 0:
            logger.info("Removed user %s from event '%s' (ID: %d)", user.username, event.name, event.id)
            return True
        return False
