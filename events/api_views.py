import logging
from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from events.models import Event, EventMembership
from events.services import EventService
from events.serializers import EventSerializer, EventMemberSerializer, AddMemberSerializer
from events.permissions import IsEventAdmin, IsEventMemberOrAdmin
from accounts.permissions import IsAdminRole

logger = logging.getLogger(__name__)


class EventListCreateAPIView(APIView):
    """
    GET  /api/events/       - List visible events
    POST /api/events/       - Create event (Admin only)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        events = EventService.get_visible_events_for_user(request.user)
        serializer = EventSerializer(events, many=True)
        return Response({
            "success": True,
            "data": serializer.data
        }, status=status.HTTP_200_OK)

    def post(self, request):
        if not (request.user.is_superuser or (hasattr(request.user, 'profile') and request.user.profile.is_admin)):
            return Response({
                "success": False,
                "error": {
                    "code": "FORBIDDEN",
                    "message": "Only administrators can create events."
                }
            }, status=status.HTTP_403_FORBIDDEN)

        serializer = EventSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                "success": False,
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Invalid event data.",
                    "fields": serializer.errors
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        event = EventService.create_event(
            name=serializer.validated_data['name'],
            event_date=serializer.validated_data['event_date'],
            created_by=request.user,
            description=serializer.validated_data.get('description', ''),
            location=serializer.validated_data.get('location', '')
        )
        return Response({
            "success": True,
            "data": EventSerializer(event).data
        }, status=status.HTTP_201_CREATED)


class EventDetailAPIView(APIView):
    """
    GET    /api/events/{id}/  - Retrieve event
    PATCH  /api/events/{id}/  - Update event (Admin only)
    DELETE /api/events/{id}/  - Delete event (Admin only)
    """
    permission_classes = [IsAuthenticated, IsEventMemberOrAdmin]

    def get_object(self, event_id, user):
        event = get_object_or_404(Event, id=event_id)
        self.check_object_permissions(self.request, event)
        return event

    def get(self, request, id):
        event = self.get_object(id, request.user)
        return Response({
            "success": True,
            "data": EventSerializer(event).data
        }, status=status.HTTP_200_OK)

    def patch(self, request, id):
        event = self.get_object(id, request.user)
        if not EventService.can_user_manage_event(request.user, event):
            return Response({
                "success": False,
                "error": {
                    "code": "FORBIDDEN",
                    "message": "Only administrators can modify events."
                }
            }, status=status.HTTP_403_FORBIDDEN)

        serializer = EventSerializer(event, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response({
                "success": False,
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Invalid event update data.",
                    "fields": serializer.errors
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        serializer.save()
        return Response({
            "success": True,
            "data": serializer.data
        }, status=status.HTTP_200_OK)

    def delete(self, request, id):
        event = self.get_object(id, request.user)
        if not EventService.can_user_manage_event(request.user, event):
            return Response({
                "success": False,
                "error": {
                    "code": "FORBIDDEN",
                    "message": "Only administrators can delete events."
                }
            }, status=status.HTTP_403_FORBIDDEN)

        event.delete()
        return Response({
            "success": True,
            "data": {"message": "Event deleted successfully."}
        }, status=status.HTTP_200_OK)


class EventMembersAPIView(APIView):
    """
    GET  /api/events/{id}/members/  - List event members
    POST /api/events/{id}/members/  - Add member (Admin only)
    """
    permission_classes = [IsAuthenticated, IsEventMemberOrAdmin]

    def get(self, request, id):
        event = get_object_or_404(Event, id=id)
        self.check_object_permissions(request, event)
        memberships = event.memberships.select_related('user', 'user__profile')
        return Response({
            "success": True,
            "data": EventMemberSerializer(memberships, many=True).data
        }, status=status.HTTP_200_OK)

    def post(self, request, id):
        event = get_object_or_404(Event, id=id)
        if not EventService.can_user_manage_event(request.user, event):
            return Response({
                "success": False,
                "error": {
                    "code": "FORBIDDEN",
                    "message": "Only administrators can assign team members."
                }
            }, status=status.HTTP_403_FORBIDDEN)

        serializer = AddMemberSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                "success": False,
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "user_id is required.",
                    "fields": serializer.errors
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        user_to_add = get_object_or_404(User, id=serializer.validated_data['user_id'])
        try:
            membership = EventService.add_team_member(event, user_to_add, acting_user=request.user)
            return Response({
                "success": True,
                "data": EventMemberSerializer(membership).data
            }, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({
                "success": False,
                "error": {
                    "code": "DUPLICATE_MEMBERSHIP",
                    "message": str(e.message)
                }
            }, status=status.HTTP_409_CONFLICT)


class EventMemberDetailAPIView(APIView):
    """
    DELETE /api/events/{id}/members/{user_id}/  - Remove member (Admin only)
    """
    permission_classes = [IsAuthenticated, IsEventAdmin]

    def delete(self, request, id, user_id):
        event = get_object_or_404(Event, id=id)
        user_to_remove = get_object_or_404(User, id=user_id)
        if EventService.remove_team_member(event, user_to_remove, acting_user=request.user):
            return Response({
                "success": True,
                "data": {"message": f"User {user_to_remove.username} removed from event."}
            }, status=status.HTTP_200_OK)
        return Response({
            "success": False,
            "error": {
                "code": "NOT_FOUND",
                "message": "User was not assigned to this event."
            }
        }, status=status.HTTP_404_NOT_FOUND)
