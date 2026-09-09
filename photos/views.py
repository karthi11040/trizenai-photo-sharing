import logging
from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse, HttpResponse
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.core.exceptions import ValidationError, PermissionDenied

from events.models import Event
from events.permissions import event_access_required
from photos.models import Photo
from photos.services import PhotoService
from photos.storage import StorageService

logger = logging.getLogger(__name__)


@login_required
@event_access_required
def upload_photos(request, event_id):
    """
    Multi-photo upload view.
    Accessible to Event Admin and assigned Team Members (Rule 31).
    """
    event = request.event

    if request.method == 'POST':
        files = request.FILES.getlist('photos')
        if not files:
            messages.error(request, "Please select at least one photo to upload.")
            return redirect('photos:upload_photos', event_id=event.id)

        uploaded_count = 0
        errors = []

        for file_obj in files:
            try:
                PhotoService.upload_photo(
                    event=event,
                    user=request.user,
                    file_obj=file_obj,
                    filename=file_obj.name
                )
                uploaded_count += 1
            except (ValidationError, PermissionDenied) as e:
                errors.append(f"{file_obj.name}: {e.message if hasattr(e, 'message') else str(e)}")
            except Exception as e:
                logger.exception("Unexpected error uploading photo %s: %s", file_obj.name, e)
                errors.append(f"{file_obj.name}: Unexpected upload failure.")

        if uploaded_count > 0:
            messages.success(request, f"Successfully uploaded {uploaded_count} photo(s).")
        for err in errors:
            messages.error(request, err)

        # Support AJAX uploads with JSON response
        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return JsonResponse({
                "success": uploaded_count > 0,
                "uploaded_count": uploaded_count,
                "errors": errors
            })

        return redirect('photos:event_photos', event_id=event.id)

    # GET: Render upload page
    return render(request, 'photos/upload.html', {
        'event': event,
    })


def get_selected_photo_ids(request, event_id: int) -> set:
    """Returns set of selected photo IDs for an event stored in user session."""
    key = f"event_selected_photos_{event_id}"
    return set(request.session.get(key, []))


def save_selected_photo_ids(request, event_id: int, photo_ids_set: set):
    """Saves set of selected photo IDs for an event to user session."""
    key = f"event_selected_photos_{event_id}"
    request.session[key] = list(photo_ids_set)
    request.session.modified = True


from collections import defaultdict
from django.utils import timezone


def group_photos_by_upload_date(photos, sort_order='desc'):
    """
    Groups a list of photo context dicts by photo.uploaded_at date in configured local timezone.
    Returns list of dicts: [{'date': date_obj, 'date_str': '08 September 2026', 'date_iso': '2026-09-08', 'items': [...]}]
    """
    grouped_dict = defaultdict(list)
    for p_item in photos:
        local_dt = timezone.localtime(p_item['obj'].uploaded_at)
        upload_date = local_dt.date()
        grouped_dict[upload_date].append(p_item)

    reverse_sort = (sort_order != 'asc')
    sorted_dates = sorted(grouped_dict.keys(), reverse=reverse_sort)

    return [
        {
            'date': d,
            'date_str': d.strftime('%d %B %Y'),
            'date_iso': d.strftime('%Y-%m-%d'),
            'items': grouped_dict[d]
        }
        for d in sorted_dates
    ]


@login_required
@event_access_required
def event_photos(request, event_id):
    """
    Displays photographs for an event:
    - Admin: All uploaded photographs across all team members with server selection tracking.
    - Team Member: Only photographs uploaded by the logged-in team member.
    """
    from galleries.models import Gallery, GalleryPhoto

    event = request.event
    photos_qs = PhotoService.get_visible_photos_for_event(request.user, event).select_related('uploaded_by')
    is_admin = request.user.is_superuser or (
        hasattr(request.user, 'profile') and request.user.profile.is_admin
    )

    # Filtering and sorting parameters
    sort_param = request.GET.get('sort', 'desc')
    date_param = request.GET.get('date', '').strip()
    date_from = request.GET.get('date_from', '').strip()
    date_to = request.GET.get('date_to', '').strip()
    shooter_param = request.GET.get('shooter', '').strip()
    search_param = request.GET.get('q', '').strip()

    if date_param:
        photos_qs = photos_qs.filter(uploaded_at__date=date_param)
    if date_from:
        photos_qs = photos_qs.filter(uploaded_at__date__gte=date_from)
    if date_to:
        photos_qs = photos_qs.filter(uploaded_at__date__lte=date_to)
    if shooter_param and shooter_param != 'all':
        try:
            photos_qs = photos_qs.filter(uploaded_by_id=int(shooter_param))
        except ValueError:
            pass
    if search_param:
        photos_qs = photos_qs.filter(filename__icontains=search_param)

    if sort_param == 'asc':
        photos_qs = photos_qs.order_by('uploaded_at', 'id')
    else:
        photos_qs = photos_qs.order_by('-uploaded_at', '-id')

    gallery = Gallery.objects.filter(event=event).first()
    published_photo_ids = set(GalleryPhoto.objects.filter(gallery=gallery).values_list('photo_id', flat=True)) if gallery else set()
    selected_ids = get_selected_photo_ids(request, event.id) - published_photo_ids
    save_selected_photo_ids(request, event.id, selected_ids)

    # Attach signed URLs for template rendering
    photos = []
    for photo in photos_qs:
        signed_url = None
        try:
            signed_url = StorageService.create_signed_url(photo.storage_path, expires_in=3600)
        except Exception:
            signed_url = None

        is_in_gallery = photo.id in published_photo_ids
        photos.append({
            'obj': photo,
            'signed_url': signed_url,
            'is_owner': photo.uploaded_by_id == request.user.id,
            'is_selected': photo.id in selected_ids and not is_in_gallery,
            'is_in_gallery': is_in_gallery,
        })

    grouped_photos = group_photos_by_upload_date(photos, sort_order=sort_param)

    if request.headers.get('HX-Request') and request.GET.get('partial') == 'grid':
        return render(request, 'photos/partials/photo_grid_partial.html', {
            'event': event,
            'photos': photos,
            'grouped_photos': grouped_photos,
            'is_admin': is_admin,
        })

    return render(request, 'photos/event_photos.html', {
        'event': event,
        'photos': photos,
        'grouped_photos': grouped_photos,
        'selected_count': len(selected_ids),
        'is_admin': is_admin,
    })


@login_required
@event_access_required
def toggle_photo_select(request, event_id, photo_id):
    """
    Toggles photo selection state server-side.
    Enforces Admin authorization and event boundary validation.
    """
    import json
    from galleries.models import Gallery, GalleryPhoto

    event = request.event
    if not (request.user.is_superuser or (hasattr(request.user, 'profile') and request.user.profile.is_admin)):
        raise PermissionDenied("Only Administrators can curate and select event photos.")

    photo = get_object_or_404(Photo, id=photo_id, event=event)
    gallery = Gallery.objects.filter(event=event).first()
    is_in_gallery = GalleryPhoto.objects.filter(gallery=gallery, photo=photo).exists() if gallery else False

    selected_ids = get_selected_photo_ids(request, event.id)

    if is_in_gallery:
        selected_ids.discard(photo.id)
        is_selected = False
    else:
        if photo.id in selected_ids:
            selected_ids.remove(photo.id)
            is_selected = False
        else:
            selected_ids.add(photo.id)
            is_selected = True

    save_selected_photo_ids(request, event.id, selected_ids)

    signed_url = None
    try:
        signed_url = StorageService.create_signed_url(photo.storage_path, expires_in=3600)
    except Exception:
        signed_url = None

    item = {
        'obj': photo,
        'signed_url': signed_url,
        'is_selected': is_selected,
        'is_in_gallery': is_in_gallery,
    }

    response = render(request, 'photos/partials/photo_card.html', {
        'event': event,
        'item': item,
    })
    response['HX-Trigger'] = json.dumps({
        'updateSelectedCount': len(selected_ids)
    })
    return response


@login_required
@event_access_required
def select_all_photos(request, event_id):
    """
    Selects all un-published photos belonging to the specified Event.
    """
    import json
    from galleries.models import Gallery, GalleryPhoto

    event = request.event
    if not (request.user.is_superuser or (hasattr(request.user, 'profile') and request.user.profile.is_admin)):
        raise PermissionDenied("Only Administrators can perform batch selections.")

    gallery = Gallery.objects.filter(event=event).first()
    published_photo_ids = set(GalleryPhoto.objects.filter(gallery=gallery).values_list('photo_id', flat=True)) if gallery else set()

    unlive_ids = set(event.photos.exclude(id__in=published_photo_ids).values_list('id', flat=True))
    save_selected_photo_ids(request, event.id, unlive_ids)

    photos_qs = event.photos.select_related('uploaded_by').order_by('-uploaded_at', '-id')
    photos = []
    for photo in photos_qs:
        signed_url = None
        try:
            signed_url = StorageService.create_signed_url(photo.storage_path, expires_in=3600)
        except Exception:
            signed_url = None
        photos.append({
            'obj': photo,
            'signed_url': signed_url,
            'is_selected': photo.id in unlive_ids,
            'is_in_gallery': photo.id in published_photo_ids,
        })

    grouped_photos = group_photos_by_upload_date(photos, sort_order='desc')

    response = render(request, 'photos/partials/photo_grid_partial.html', {
        'event': event,
        'photos': photos,
        'grouped_photos': grouped_photos,
    })
    response['HX-Trigger'] = json.dumps({
        'updateSelectedCount': len(unlive_ids)
    })
    return response


@login_required
@event_access_required
def clear_photo_selection(request, event_id):
    """
    Clears all photo selections for the specified Event.
    """
    import json
    from galleries.models import Gallery, GalleryPhoto

    event = request.event
    save_selected_photo_ids(request, event.id, set())

    gallery = Gallery.objects.filter(event=event).first()
    published_photo_ids = set(GalleryPhoto.objects.filter(gallery=gallery).values_list('photo_id', flat=True)) if gallery else set()

    photos_qs = event.photos.select_related('uploaded_by').order_by('-uploaded_at', '-id')
    photos = []
    for photo in photos_qs:
        signed_url = None
        try:
            signed_url = StorageService.create_signed_url(photo.storage_path, expires_in=3600)
        except Exception:
            signed_url = None
        photos.append({
            'obj': photo,
            'signed_url': signed_url,
            'is_selected': False,
            'is_in_gallery': photo.id in published_photo_ids,
        })

    grouped_photos = group_photos_by_upload_date(photos, sort_order='desc')

    response = render(request, 'photos/partials/photo_grid_partial.html', {
        'event': event,
        'photos': photos,
        'grouped_photos': grouped_photos,
    })
    response['HX-Trigger'] = json.dumps({
        'updateSelectedCount': 0
    })
    return response


@login_required
@event_access_required
def live_photos(request, event_id):
    """
    HTMX live polling endpoint to detect newly uploaded photos.
    Returns new photo cards with their own exact server-generated uploaded_at timestamps.
    """
    import json
    from galleries.models import Gallery, GalleryPhoto

    event = request.event
    try:
        known_count = int(request.GET.get('known_count', 0))
    except (ValueError, TypeError):
        known_count = 0

    photos_qs = PhotoService.get_visible_photos_for_event(request.user, event).order_by('uploaded_at', 'id')
    current_count = photos_qs.count()
    if current_count <= known_count:
        return HttpResponse(status=204)

    # Fetch new photos uploaded since known_count
    new_photos_qs = photos_qs[known_count:]
    selected_ids = get_selected_photo_ids(request, event.id)

    gallery = Gallery.objects.filter(event=event).first()
    published_photo_ids = set(GalleryPhoto.objects.filter(gallery=gallery).values_list('photo_id', flat=True)) if gallery else set()

    new_items = []
    for photo in new_photos_qs:
        signed_url = None
        try:
            signed_url = StorageService.create_signed_url(photo.storage_path, expires_in=3600)
        except Exception:
            signed_url = None
        new_items.append({
            'obj': photo,
            'signed_url': signed_url,
            'is_selected': photo.id in selected_ids,
            'is_in_gallery': photo.id in published_photo_ids,
        })

    grouped_photos = group_photos_by_upload_date(new_items, sort_order='desc')

    response = render(request, 'photos/partials/photo_grid_partial.html', {
        'event': event,
        'photos': new_items,
        'grouped_photos': grouped_photos,
    })
    response['HX-Trigger'] = json.dumps({
        'newPhotosUploaded': {
            'added_count': len(new_items),
            'total_count': current_count,
        }
    })
    return response



@login_required
def delete_photo(request, photo_id):
    """
    Deletes a photo. Only permitted for Admins or the original uploader (Rule 31).
    Supports HTMX dynamic row removal without page reloads.
    """
    import json
    photo = get_object_or_404(Photo, id=photo_id)
    event_id = photo.event_id

    if request.method in ['POST', 'DELETE']:
        try:
            PhotoService.delete_photo(photo, acting_user=request.user)
            msg = f"Photo '{photo.filename}' has been deleted."
            if request.headers.get('HX-Request'):
                resp = HttpResponse('', status=200)
                resp['HX-Trigger'] = json.dumps({'showToast': msg})
                return resp
            messages.success(request, msg)
        except PermissionDenied as e:
            if request.headers.get('HX-Request'):
                resp = HttpResponse(str(e), status=403)
                resp['HX-Trigger'] = json.dumps({'showToast': str(e)})
                return resp
            messages.error(request, str(e))

    return redirect('photos:event_photos', event_id=event_id)


def mock_stream(request, storage_path):
    """
    Simulated binary streaming view for offline development and testing.
    """
    content = StorageService.get_mock_content(storage_path)
    if not content:
        # Fallback SVG placeholder
        content = b'<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#1e293b"/><text x="50%" y="50%" fill="#ffffff" font-size="24" font-family="sans-serif" text-anchor="middle">Photo Placeholder</text></svg>'
        return HttpResponse(content, content_type="image/svg+xml")

    # Basic MIME guessing
    mime = "image/jpeg"
    if storage_path.endswith(".png"):
        mime = "image/png"
    elif storage_path.endswith(".webp"):
        mime = "image/webp"

    return HttpResponse(content, content_type=mime)


@login_required
def photo_review_hub(request):
    """
    Dedicated Photo Review & Curation Hub.
    Lists all events with their real photo counts, proofing status, batch counters,
    and direct links to the curation grid.
    """
    is_admin = request.user.is_superuser or (hasattr(request.user, 'profile') and request.user.profile.is_admin)

    if is_admin:
        events_qs = Event.objects.all().prefetch_related('memberships__user', 'photos')
    else:
        events_qs = Event.objects.filter(memberships__user=request.user).prefetch_related('memberships__user', 'photos')

    events_list = []
    total_photos_count = 0
    total_in_review = 0
    curated_ready_count = 0

    for ev in events_qs:
        p_count = ev.photos.count()
        total_photos_count += p_count
        has_gallery = hasattr(ev, 'gallery') and ev.gallery is not None
        is_published = has_gallery and ev.gallery.is_published

        first_p = ev.photos.first()
        thumb_url = ev.get_thumbnail_url()

        curated_count = ev.gallery.gallery_photos.count() if has_gallery else 0

        curated_ready_count += curated_count
        curated_pct = int((curated_count / p_count) * 100) if p_count > 0 else (100 if is_published else 0)

        if is_published:
            status_label = 'Gallery Published'
            status_class = 'success'
            badge_tag = 'DELIVERED'
        elif p_count > 0:
            status_label = 'Review in Progress'
            status_class = 'warning'
            badge_tag = f"{p_count} PHOTOS"
            total_in_review += (p_count - curated_count)
        else:
            status_label = 'Awaiting Upload'
            status_class = 'secondary'
            badge_tag = 'NEW EVENT'

        events_list.append({
            'id': ev.id,
            'name': ev.name,
            'location': ev.location or 'Location not specified',
            'date_str': ev.event_date.strftime('%b %d, %Y') if ev.event_date else 'Date not set',
            'badge_tag': badge_tag,
            'status_label': status_label,
            'status_class': status_class,
            'photos_count': f"{p_count:,}",
            'shooters_count': ev.memberships.count(),
            'curated_pct': curated_pct,
            'is_published': is_published,
            'thumbnail_url': thumb_url,
            'review_url': f"/photos/event/{ev.id}/",
            'upload_url': f"/photos/event/{ev.id}/upload/",
        })

    context = {
        'events': events_list,
        'total_events': len(events_list),
        'total_photos_count': total_photos_count,
        'total_in_review': total_in_review,
        'curated_ready_count': curated_ready_count,
        'is_admin': is_admin,
    }
    return render(request, 'photos/photo_review_hub.html', context)
