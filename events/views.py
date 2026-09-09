import json
import logging
from django.shortcuts import render, redirect, get_object_or_404
from django.http import HttpResponse, JsonResponse
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.core.exceptions import PermissionDenied, ValidationError
from django.contrib.auth.models import User
from django.template.loader import render_to_string
from events.models import Event, EventMembership
from events.services import EventService
from events.forms import EventForm, AddMemberForm
from events.permissions import event_access_required, event_manage_required
from accounts.permissions import admin_required, team_member_required

logger = logging.getLogger(__name__)


@login_required
def event_list(request):
    """
    Admin view of all events with live HTMX search, cover thumbnails, assignment badges, and photo stats.
    """
    from photos.storage import StorageService

    if not (request.user.is_superuser or (hasattr(request.user, 'profile') and request.user.profile.is_admin)):
        return redirect('events:assigned_events')

    q = request.GET.get('q', '').strip()
    events_qs = EventService.get_visible_events_for_user(request.user).prefetch_related('memberships__user', 'photos', 'gallery')
    if q:
        events_qs = events_qs.filter(name__icontains=q) | events_qs.filter(location__icontains=q)

    events_data = []
    for ev in events_qs:
        thumb_url = ev.get_thumbnail_url()

        has_gallery = hasattr(ev, 'gallery') and ev.gallery is not None
        is_published = has_gallery and ev.gallery.is_published

        events_data.append({
            'event': ev,
            'thumbnail_url': thumb_url,
            'photos_count': ev.photos.count(),
            'members_count': ev.memberships.count(),
            'is_published': is_published,
        })


    is_admin = request.user.is_superuser or (hasattr(request.user, 'profile') and request.user.profile.is_admin)

    context = {
        'events_data': events_data,
        'total_events': len(events_data),
        'is_admin': is_admin,
        'query': q,
    }

    if request.headers.get('HX-Request'):
        return render(request, 'events/partials/event_list_grid.html', context)

    return render(request, 'events/event_list.html', context)


@login_required
def assigned_events(request):
    """
    Team Member view: Only displays events where the user is an assigned member with cover previews.
    """
    events_qs = EventService.get_visible_events_for_user(request.user).prefetch_related('memberships__user', 'photos', 'gallery')
    events_data = []

    for ev in events_qs:
        thumb_url = ev.get_thumbnail_url()
        my_photos_count = ev.photos.filter(uploaded_by=request.user).count()

        events_data.append({
            'event': ev,
            'thumbnail_url': thumb_url,
            'photos_count': ev.photos.count(),
            'my_photos_count': my_photos_count,
            'members_count': ev.memberships.count(),
        })

    return render(request, 'events/assigned_events.html', {
        'events_data': events_data,
        'total_events': len(events_data)
    })


@login_required
@event_access_required
def event_detail(request, event_id):
    """
    Detailed event view with HTMX add/remove member partials.
    """
    from photos.storage import StorageService

    event = request.event
    is_admin = EventService.can_user_manage_event(request.user, event)
    memberships = event.memberships.select_related('user', 'user__profile')
    add_member_form = AddMemberForm(event=event) if is_admin else None
    photos_qs = event.photos.select_related('uploaded_by').order_by('-created_at')[:48]
    photos_count = event.photos.count()

    photos = []
    for p in photos_qs:
        signed_url = None
        try:
            signed_url = StorageService.create_signed_url(p.storage_path, expires_in=3600)
        except Exception:
            signed_url = None
        photos.append({
            'id': p.id,
            'filename': p.filename,
            'uploaded_by': p.uploaded_by,
            'file_size': p.file_size,
            'created_at': p.created_at,
            'storage_path': p.storage_path,
            'signed_url': signed_url,
        })

    cover_url = event.get_thumbnail_url()

    context = {
        'event': event,
        'cover_url': cover_url,
        'is_admin': is_admin,
        'memberships': memberships,
        'add_member_form': add_member_form,
        'photos': photos,
        'photos_count': photos_count,
    }

    if request.headers.get('HX-Request') and request.GET.get('partial') == 'members':
        return render(request, 'events/partials/team_member_list.html', context)

    return render(request, 'events/event_detail.html', context)



@admin_required
def event_create(request):
    """
    Creates a new event with optional cover image. Supports HTMX live insertion.
    """
    is_htmx = bool(request.headers.get('HX-Request'))

    if request.method == 'POST':
        form = EventForm(request.POST, request.FILES)
        if form.is_valid():
            event = EventService.create_event(
                name=form.cleaned_data['name'],
                event_date=form.cleaned_data['event_date'],
                created_by=request.user,
                description=form.cleaned_data.get('description', ''),
                location=form.cleaned_data.get('location', ''),
                cover_image=form.cleaned_data.get('cover_image')
            )

            if is_htmx:
                html = render_to_string('events/partials/event_card.html', {
                    'event': event,
                    'is_admin': True,
                    'photos_count': 0,
                    'members_count': 1,
                    'is_published': False,
                    'thumbnail_url': event.cover_image.url if event.cover_image else None,
                }, request=request)
                response = HttpResponse(html)
                response['HX-Trigger'] = json.dumps({
                    'closeModal': True,
                    'showToast': f"Event '{event.name}' created successfully!"
                })
                return response

            messages.success(request, f"Event '{event.name}' created successfully.")
            return redirect('events:event_detail', event_id=event.id)
        else:
            if is_htmx:
                return render(request, 'events/partials/event_form_modal.html', {
                    'form': form,
                    'action_title': 'Create New Event',
                    'button_text': 'Create Event'
                })
    else:
        form = EventForm()

    if is_htmx:
        return render(request, 'events/partials/event_form_modal.html', {
            'form': form,
            'action_title': 'Create New Event',
            'button_text': 'Create Event'
        })

    return render(request, 'events/event_form.html', {
        'form': form,
        'action_title': 'Create New Event',
        'button_text': 'Create Event'
    })


@event_manage_required
def event_update(request, event_id):
    """
    Edits event details and cover image. Supports HTMX live swapping.
    """
    event = request.event
    is_htmx = bool(request.headers.get('HX-Request'))

    if request.method == 'POST':
        form = EventForm(request.POST, request.FILES, instance=event)
        if form.is_valid():
            form.save()

            if is_htmx:
                html = render_to_string('events/partials/event_card.html', {
                    'event': event,
                    'is_admin': True,
                    'photos_count': event.photos.count(),
                    'members_count': event.memberships.count(),
                    'is_published': hasattr(event, 'gallery') and event.gallery.is_published,
                    'thumbnail_url': event.cover_image.url if event.cover_image else None,
                }, request=request)
                response = HttpResponse(html)
                response['HX-Trigger'] = json.dumps({
                    'closeModal': True,
                    'showToast': f"Event '{event.name}' updated!"
                })
                return response

            messages.success(request, f"Event '{event.name}' updated successfully.")
            return redirect('events:event_detail', event_id=event.id)
        else:
            if is_htmx:
                return render(request, 'events/partials/event_form_modal.html', {
                    'form': form,
                    'event': event,
                    'action_title': f"Edit Event: {event.name}",
                    'button_text': 'Save Changes'
                })
    else:
        form = EventForm(instance=event)

    if is_htmx:
        return render(request, 'events/partials/event_form_modal.html', {
            'form': form,
            'event': event,
            'action_title': f"Edit Event: {event.name}",
            'button_text': 'Save Changes'
        })

    return render(request, 'events/event_form.html', {
        'form': form,
        'event': event,
        'action_title': f"Edit Event: {event.name}",
        'button_text': 'Save Changes'
    })


@event_manage_required
def event_delete(request, event_id):
    """
    Deletes an event with HTMX live removal.
    """
    event = request.event
    is_htmx = bool(request.headers.get('HX-Request'))

    if request.method in ['POST', 'DELETE']:
        name = event.name
        event.delete()

        if is_htmx:
            response = HttpResponse("")
            response['HX-Trigger'] = json.dumps({
                'showToast': f"Event '{name}' has been deleted."
            })
            return response

        messages.success(request, f"Event '{name}' has been deleted.")
        return redirect('events:event_list')

    return render(request, 'events/event_confirm_delete.html', {'event': event})


@event_manage_required
def add_member(request, event_id):
    """
    Adds an assigned team member to an event. Supports HTMX live member insertion.
    """
    event = request.event
    is_htmx = bool(request.headers.get('HX-Request'))

    if request.method == 'POST':
        form = AddMemberForm(request.POST, event=event)
        if form.is_valid():
            user_to_add = form.cleaned_data['user']
            try:
                EventService.add_team_member(event, user_to_add, acting_user=request.user)
                msg = f"Added {user_to_add.username} to {event.name}."

                if is_htmx:
                    memberships = event.memberships.select_related('user', 'user__profile')
                    add_member_form = AddMemberForm(event=event)
                    html = render_to_string('events/partials/team_member_list.html', {
                        'event': event,
                        'memberships': memberships,
                        'add_member_form': add_member_form,
                        'is_admin': True,
                    }, request=request)
                    response = HttpResponse(html)
                    response['HX-Trigger'] = json.dumps({'showToast': msg})
                    return response

                messages.success(request, msg)
            except ValidationError as e:
                if is_htmx:
                    response = HttpResponse(render_to_string('events/partials/team_member_list.html', {
                        'event': event,
                        'memberships': event.memberships.select_related('user', 'user__profile'),
                        'add_member_form': form,
                        'is_admin': True,
                    }, request=request))
                    response['HX-Trigger'] = json.dumps({'showToast': {'message': str(e.message), 'type': 'danger'}})
                    return response
                messages.error(request, str(e.message))

    return redirect('events:event_detail', event_id=event.id)


@event_manage_required
def remove_member(request, event_id, user_id):
    """
    Removes a team member assignment from an event. Supports HTMX live removal.
    """
    event = request.event
    is_htmx = bool(request.headers.get('HX-Request'))

    if request.method in ['POST', 'DELETE']:
        user_to_remove = get_object_or_404(User, id=user_id)
        if EventService.remove_team_member(event, user_to_remove, acting_user=request.user):
            msg = f"Removed {user_to_remove.username} from {event.name}."
            if is_htmx:
                memberships = event.memberships.select_related('user', 'user__profile')
                add_member_form = AddMemberForm(event=event)
                html = render_to_string('events/partials/team_member_list.html', {
                    'event': event,
                    'memberships': memberships,
                    'add_member_form': add_member_form,
                    'is_admin': True,
                }, request=request)
                response = HttpResponse(html)
                response['HX-Trigger'] = json.dumps({'showToast': msg})
                return response
            messages.success(request, msg)

    return redirect('events:event_detail', event_id=event.id)
