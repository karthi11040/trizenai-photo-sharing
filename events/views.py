import logging
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.core.exceptions import PermissionDenied, ValidationError
from django.contrib.auth.models import User
from events.models import Event, EventMembership
from events.services import EventService
from events.forms import EventForm, AddMemberForm
from events.permissions import event_access_required, event_manage_required
from accounts.permissions import admin_required, team_member_required

logger = logging.getLogger(__name__)


@login_required
def event_list(request):
    """
    Admin view of all events.
    If a Team Member hits this view, redirect them to their assigned events.
    """
    if not (request.user.is_superuser or (hasattr(request.user, 'profile') and request.user.profile.is_admin)):
        return redirect('events:assigned_events')

    events = EventService.get_visible_events_for_user(request.user)
    return render(request, 'events/event_list.html', {'events': events})


@login_required
def assigned_events(request):
    """
    Team Member view: Only displays events where the user is an assigned member.
    """
    events = EventService.get_visible_events_for_user(request.user)
    return render(request, 'events/assigned_events.html', {'events': events})


@login_required
@event_access_required
def event_detail(request, event_id):
    """
    Detailed event view.
    - Admins see full controls, assigned team members list, and member assignment form.
    - Assigned Team Members see event details and upload links.
    - Unassigned users are rejected by the @event_access_required decorator (HTTP 403).
    """
    event = request.event
    is_admin = EventService.can_user_manage_event(request.user, event)
    memberships = event.memberships.select_related('user', 'user__profile')
    add_member_form = AddMemberForm(event=event) if is_admin else None

    return render(request, 'events/event_detail.html', {
        'event': event,
        'is_admin': is_admin,
        'memberships': memberships,
        'add_member_form': add_member_form,
    })


@admin_required
def event_create(request):
    """
    Creates a new event. Strictly restricted to Admins.
    """
    if request.method == 'POST':
        form = EventForm(request.POST)
        if form.is_valid():
            event = EventService.create_event(
                name=form.cleaned_data['name'],
                event_date=form.cleaned_data['event_date'],
                created_by=request.user,
                description=form.cleaned_data.get('description', ''),
                location=form.cleaned_data.get('location', '')
            )
            messages.success(request, f"Event '{event.name}' has been created successfully.")
            return redirect('events:event_detail', event_id=event.id)
    else:
        form = EventForm()

    return render(request, 'events/event_form.html', {
        'form': form,
        'action_title': 'Create New Event',
        'button_text': 'Create Event'
    })


@event_manage_required
def event_update(request, event_id):
    """
    Edits event details. Strictly restricted to Admins.
    """
    event = request.event
    if request.method == 'POST':
        form = EventForm(request.POST, instance=event)
        if form.is_valid():
            form.save()
            messages.success(request, f"Event '{event.name}' updated successfully.")
            return redirect('events:event_detail', event_id=event.id)
    else:
        form = EventForm(instance=event)

    return render(request, 'events/event_form.html', {
        'form': form,
        'event': event,
        'action_title': f"Edit Event: {event.name}",
        'button_text': 'Save Changes'
    })


@event_manage_required
def event_delete(request, event_id):
    """
    Deletes an event. Strictly restricted to Admins.
    """
    event = request.event
    if request.method == 'POST':
        name = event.name
        event.delete()
        messages.success(request, f"Event '{name}' has been deleted.")
        return redirect('events:event_list')

    return render(request, 'events/event_confirm_delete.html', {'event': event})


@event_manage_required
def add_member(request, event_id):
    """
    Adds an assigned team member to an event. Admin-only.
    """
    event = request.event
    if request.method == 'POST':
        form = AddMemberForm(request.POST, event=event)
        if form.is_valid():
            user_to_add = form.cleaned_data['user']
            try:
                EventService.add_team_member(event, user_to_add, acting_user=request.user)
                messages.success(request, f"Added {user_to_add.username} to {event.name}.")
            except ValidationError as e:
                messages.error(request, str(e.message))
        else:
            messages.error(request, "Please select a valid team member.")

    return redirect('events:event_detail', event_id=event.id)


@event_manage_required
def remove_member(request, event_id, user_id):
    """
    Removes a team member assignment from an event. Admin-only.
    """
    event = request.event
    if request.method == 'POST':
        user_to_remove = get_object_or_404(User, id=user_id)
        if EventService.remove_team_member(event, user_to_remove, acting_user=request.user):
            messages.success(request, f"Removed {user_to_remove.username} from {event.name}.")
        else:
            messages.warning(request, f"{user_to_remove.username} was not assigned to this event.")

    return redirect('events:event_detail', event_id=event.id)
