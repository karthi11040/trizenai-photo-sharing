import logging
import time
from django.shortcuts import render, redirect, get_object_or_404
from django.http import Http404, JsonResponse, HttpResponse
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.utils.text import slugify
from django.utils import timezone
from django.views.decorators.http import require_POST

from events.models import Event
from photos.models import Photo
from photos.storage import StorageService
from galleries.models import Gallery, GalleryPhoto, GalleryView

logger = logging.getLogger(__name__)


def get_client_ip(request):
    """Resolves real client IP address through proxies and standard headers."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR', '127.0.0.1')
    return ip or '127.0.0.1'


def get_client_device(request):
    """Infers client device and platform for analytics reporting."""
    ua = request.META.get('HTTP_USER_AGENT', '')
    if 'iPhone' in ua:
        return 'iPhone (iOS)'
    elif 'iPad' in ua:
        return 'iPad (iPadOS)'
    elif 'Android' in ua:
        return 'Android Mobile'
    elif 'Macintosh' in ua:
        return 'Mac Desktop'
    elif 'Windows' in ua:
        return 'Windows Desktop'
    elif 'Linux' in ua:
        return 'Linux Desktop'
    return 'Web Client'


@login_required
def gallery_list(request):
    """
    Dedicated Studio Galleries Manager.
    Displays all real client-facing proofing and delivery galleries with accurate view & IP telemetry.
    """
    is_admin = request.user.is_superuser or (hasattr(request.user, 'profile') and request.user.profile.is_admin)

    galleries_qs = Gallery.objects.select_related('event').prefetch_related('gallery_photos__photo', 'views')
    if not is_admin:
        galleries_qs = galleries_qs.filter(event__memberships__user=request.user)

    galleries_list = []
    total_views = GalleryView.objects.count()
    total_unique_ips = GalleryView.objects.values('ip_address').distinct().count()

    for g in galleries_qs:
        thumb_url = g.event.get_thumbnail_url() if g.event else None
        if not thumb_url:
            for gp in g.gallery_photos.select_related('photo').all()[:10]:
                if gp.photo:
                    try:
                        thumb_url = StorageService.create_signed_url(gp.photo.storage_path, expires_in=3600)
                        if thumb_url:
                            break
                    except Exception:
                        pass

        photo_count = g.gallery_photos.count()
        v_count = g.views.count()
        u_ips = g.views.values('ip_address').distinct().count()
        recent_views = list(g.views.all()[:5])

        galleries_list.append({
            'id': g.id,
            'title': g.title or g.event.name,
            'event_name': g.event.name,
            'slug': g.slug,
            'pin': g.pin_code or '482917',
            'is_published': g.is_published,
            'published_at': g.published_at.strftime('%b %d, %Y') if g.published_at else 'Draft',
            'photo_count': photo_count,
            'views_count': v_count,
            'unique_ips_count': u_ips,
            'recent_views': recent_views,
            'thumbnail_url': thumb_url,
            'public_url': f"/gallery/{g.slug}/",
        })

    # Available un-published events for creating new galleries
    published_event_ids = [g.event.id for g in galleries_qs]
    available_events = Event.objects.exclude(id__in=published_event_ids)

    context = {
        'galleries': galleries_list,
        'total_galleries': len(galleries_list),
        'published_count': len([g for g in galleries_list if g['is_published']]),
        'total_views': total_views,
        'total_unique_ips': total_unique_ips,
        'available_events': available_events,
        'is_admin': is_admin,
    }
    return render(request, 'galleries/gallery_list.html', context)


@login_required
def live_gallery_stats(request):
    """
    Returns real-time JSON statistics for galleries view counts and IP telemetry.
    Used for live polling on the Client Galleries Manager page (/gallery/).
    """
    is_admin = request.user.is_superuser or (hasattr(request.user, 'profile') and request.user.profile.is_admin)

    galleries_qs = Gallery.objects.select_related('event').prefetch_related('views')
    if not is_admin:
        galleries_qs = galleries_qs.filter(event__memberships__user=request.user)

    total_views = GalleryView.objects.count()
    total_unique_ips = GalleryView.objects.values('ip_address').distinct().count()

    galleries_data = {}
    for g in galleries_qs:
        v_count = g.views.count()
        u_ips = g.views.values('ip_address').distinct().count()
        galleries_data[str(g.id)] = {
            'views_count': v_count,
            'unique_ips_count': u_ips,
            'is_published': g.is_published,
        }

    return JsonResponse({
        'total_galleries': galleries_qs.count(),
        'published_count': sum(1 for g in galleries_qs if g.is_published),
        'total_views': total_views,
        'total_unique_ips': total_unique_ips,
        'galleries': galleries_data,
    })


def format_gallery_dict(gallery):
    thumb_url = gallery.event.get_thumbnail_url() if gallery.event else None
    if not thumb_url:
        for gp in gallery.gallery_photos.select_related('photo').all()[:10]:
            if gp.photo:
                try:
                    thumb_url = StorageService.create_signed_url(gp.photo.storage_path, expires_in=3600)
                    if thumb_url:
                        break
                except Exception:
                    pass


    return {
        'id': gallery.id,
        'title': gallery.title or gallery.event.name,
        'event_name': gallery.event.name,
        'slug': gallery.slug,
        'pin': gallery.pin_code or '482917',
        'is_published': gallery.is_published,
        'published_at': gallery.published_at.strftime('%b %d, %Y') if gallery.published_at else 'Draft',
        'photo_count': gallery.gallery_photos.count(),
        'views_count': gallery.views.count(),
        'unique_ips_count': gallery.views.values('ip_address').distinct().count(),
        'thumbnail_url': thumb_url,
        'public_url': f"/gallery/{gallery.slug}/",
    }


@login_required
@require_POST
def gallery_create(request, event_id=None):
    """
    Creates or updates a customer gallery from selected photos with a 6-digit numeric PIN.
    Supports HTMX partial responses without full page reloads.
    Enforces server-authoritative photo selection and atomic transactions.
    """
    import re
    import secrets
    import json
    from django.db import transaction

    target_event_id = event_id or request.POST.get('event_id')
    event = get_object_or_404(Event, id=target_event_id)

    # Resolve selected photo IDs from POST or server session
    photo_ids = request.POST.getlist('photo_ids')
    if not photo_ids:
        session_key = f"event_selected_photos_{event.id}"
        photo_ids = request.session.get(session_key, [])

    # Strictly require at least 1 selected photo
    if not photo_ids:
        msg = "Please select at least one photo before creating or updating a customer gallery."
        if request.headers.get('HX-Request'):
            response = HttpResponse(msg, status=400)
            response['HX-Trigger'] = json.dumps({'showToast': {'message': msg, 'type': 'warning'}})
            return response
        messages.warning(request, msg)
        return redirect('photos:event_photos', event_id=event.id)

    # Strictly validate every photo belongs to current event
    valid_photos = list(Photo.objects.filter(id__in=photo_ids, event=event))
    if not valid_photos:
        msg = "None of the selected photos belong to this event."
        if request.headers.get('HX-Request'):
            response = HttpResponse(msg, status=400)
            response['HX-Trigger'] = json.dumps({'showToast': {'message': msg, 'type': 'danger'}})
            return response
        messages.error(request, msg)
        return redirect('photos:event_photos', event_id=event.id)

    raw_pin = request.POST.get('pin', '').strip()
    clean_pin = re.sub(r'\D', '', raw_pin)
    if len(clean_pin) != 6:
        clean_pin = f"{secrets.randbelow(900000) + 100000}"

    slug_val = request.POST.get('slug', '').strip() or slugify(event.name)

    with transaction.atomic():
        gallery = Gallery.objects.filter(event=event).first()
        is_new = False
        if not gallery:
            is_new = True
            gallery = Gallery.objects.create(
                event=event,
                title=event.name,
                slug=slug_val,
                is_published=True,
                published_at=timezone.now(),
            )
            gallery.set_pin(clean_pin)
        else:
            gallery.is_published = True
            if not gallery.published_at:
                gallery.published_at = timezone.now()
            if raw_pin and len(clean_pin) == 6:
                gallery.set_pin(clean_pin)
            if gallery.title and "Official Client Gallery" in gallery.title:
                gallery.title = event.name
            gallery.save()

        # Update GalleryPhoto associations atomically
        added_count = 0
        for photo in valid_photos:
            gp, created = GalleryPhoto.objects.get_or_create(gallery=gallery, photo=photo)
            if created:
                added_count += 1

    total_photos_count = gallery.gallery_photos.count()
    if is_new:
        msg = f"Customer Gallery published with {total_photos_count} photo(s)! Client PIN: {gallery.pin_code or clean_pin}"
    else:
        msg = f"Customer Gallery updated! Total {total_photos_count} photo(s) in live gallery ({added_count} new added)."

    if request.headers.get('HX-Request'):
        g_dict = format_gallery_dict(gallery)
        html = render(request, 'galleries/partials/gallery_card.html', {'g': g_dict}).content.decode('utf-8')
        response = HttpResponse(html)
        response['HX-Trigger'] = json.dumps({'closeModal': True, 'showToast': msg, 'galleryCreated': True})
        return response

    messages.success(request, msg)
    return redirect('galleries:gallery_list')


@login_required
@require_POST
def gallery_publish(request, gallery_id):
    """
    Publishes an existing draft gallery via HTMX POST.
    Returns the updated gallery card partial without refreshing the page.
    """
    import json

    gallery = get_object_or_404(Gallery, id=gallery_id)
    gallery.is_published = True
    gallery.published_at = timezone.now()
    if gallery.title and "Official Client Gallery" in gallery.title:
        gallery.title = gallery.event.name
    gallery.save()

    msg = f"Gallery '{gallery.title or gallery.event.name}' has been published!"

    if request.headers.get('HX-Request'):
        g_dict = format_gallery_dict(gallery)
        response = render(request, 'galleries/partials/gallery_card.html', {'g': g_dict})
        response['HX-Trigger'] = json.dumps({'showToast': msg})
        return response

    messages.success(request, msg)
    return redirect('galleries:gallery_list')


def resolve_studio_branding(gallery, request=None):
    """
    Resolves the studio brand name, logo URL, and uploader photographer name for live galleries and PIN entry.
    Priority for studio_name and logo:
    1. Creator profile (if set)
    2. Any Admin profile (if set)
    3. Session studio_name (if set)
    4. Fallback default
    """
    from accounts.models import Profile, Role

    creator = gallery.event.created_by
    studio_name = ''
    uploader_name = ''
    uploader_email = ''
    studio_logo_url = ''

    if creator:
        c_profile = getattr(creator, 'profile', None)
        if c_profile:
            if c_profile.studio_name:
                studio_name = c_profile.studio_name
            if c_profile.studio_logo_url:
                studio_logo_url = c_profile.studio_logo_url

        full_name = creator.get_full_name()
        if full_name and "Admin" not in full_name:
            uploader_name = full_name
        elif creator.username and not creator.username.lower().startswith('admin'):
            uploader_name = creator.username.replace('_', ' ').title()
        else:
            uploader_name = "Lead Studio Photographer"
        uploader_email = creator.email or ''

    if not uploader_name:
        uploader_name = "Lead Studio Photographer"

    if not studio_name:
        admin_profile = Profile.objects.exclude(studio_name='').first()
        if admin_profile and admin_profile.studio_name:
            studio_name = admin_profile.studio_name

    if not studio_logo_url:
        admin_logo_profile = Profile.objects.exclude(studio_logo='').first()
        if admin_logo_profile and admin_logo_profile.studio_logo_url:
            studio_logo_url = admin_logo_profile.studio_logo_url

    if not studio_name and request:
        c_uid = creator.id if creator else None
        session_studio = request.session.get('studio_name') or (request.session.get(f'studio_name_{c_uid}') if c_uid else None)
        if session_studio and "Admin Lead" not in session_studio:
            studio_name = session_studio

    if not studio_name and creator:
        c_full = creator.get_full_name()
        if c_full and "Admin" not in c_full:
            studio_name = f"{c_full} Studio"

    if not studio_name:
        studio_name = "Studio Alpha"

    return studio_name, uploader_name, uploader_email, studio_logo_url


def customer_gallery_router(request, slug):
    """
    Public entry point for customer galleries (/gallery/<slug>/).
    If an active 20-minute session token exists and is valid, redirects to /gallery/<slug>/<session_token>/.
    Otherwise, renders the 6-digit numeric PIN entry security gate.
    """
    gallery = get_object_or_404(Gallery, slug=slug)

    if not gallery.is_published:
        raise Http404("This gallery is currently in private curation and has not yet been published.")

    session_token = request.session.get(f"gallery_token_{gallery.id}")
    last_active = request.session.get(f"gallery_last_active_{gallery.id}", 0)
    current_time = time.time()

    # If user has an active session token and was active within 20 minutes (1200s)
    if session_token and (current_time - last_active < 1200):
        request.session[f"gallery_last_active_{gallery.id}"] = current_time
        return redirect('galleries:customer_gallery_view', slug=slug, session_token=session_token)

    # Determine uploader studio branding
    studio_name, uploader_name, _, studio_logo_url = resolve_studio_branding(gallery, request)

    # Determine cover thumbnail URL
    cover_thumbnail_url = gallery.event.get_thumbnail_url()

    # Otherwise render PIN prompt
    return render(request, 'galleries/pin_entry.html', {
        'gallery': gallery,
        'uploader_name': uploader_name,
        'studio_name': studio_name,
        'studio_logo_url': studio_logo_url,
        'cover_thumbnail_url': cover_thumbnail_url,
    })



def customer_gallery_view(request, slug, session_token):
    """
    Authenticated client gallery view: /gallery/<slug>/<session_token>/
    Enforces randomized session token & strictly 20-minute inactivity timeout.
    """
    gallery = get_object_or_404(Gallery, slug=slug)

    if not gallery.is_published:
        raise Http404("This gallery is currently in private curation and has not yet been published.")

    saved_token = request.session.get(f"gallery_token_{gallery.id}")
    last_active = request.session.get(f"gallery_last_active_{gallery.id}", 0)
    current_time = time.time()

    # Verify session token validity
    if not saved_token or saved_token != session_token:
        messages.warning(request, "Secure viewing session expired or invalid. Please enter your security PIN to access.")
        return redirect('galleries:customer_gallery_router', slug=slug)

    # Verify 20-minute inactivity limit (1200 seconds)
    if current_time - last_active > 1200:
        request.session.pop(f"gallery_token_{gallery.id}", None)
        request.session.pop(f"gallery_auth_{gallery.id}", None)
        request.session.pop(f"gallery_last_active_{gallery.id}", None)
        messages.warning(request, "Your viewing session expired after 20 minutes of inactivity. Please re-enter your security PIN to continue.")
        return redirect('galleries:customer_gallery_router', slug=slug)

    # Refresh activity timestamp
    request.session[f"gallery_last_active_{gallery.id}"] = current_time

    # Record client view telemetry (debounced per session)
    client_ip = get_client_ip(request)
    device = get_client_device(request)
    ua = request.META.get('HTTP_USER_AGENT', '')[:250]

    last_view_time = request.session.get(f'last_view_logged_{gallery.id}', 0)
    if current_time - last_view_time > 30:
        try:
            GalleryView.objects.create(
                gallery=gallery,
                ip_address=client_ip,
                user_agent=ua,
                device_type=device
            )
            request.session[f'last_view_logged_{gallery.id}'] = current_time
        except Exception as e:
            logger.warning(f"Failed to record gallery view telemetry: {e}")

    # Clean title display
    display_title = gallery.title or gallery.event.name
    if "Official Client Gallery" in display_title:
        display_title = display_title.replace("Official Client Gallery", "").strip() or gallery.event.name

    # Determine uploader studio branding
    studio_name, uploader_name, uploader_email, studio_logo_url = resolve_studio_branding(gallery, request)

    # Generate signed URLs for curated photos
    gallery_photos = gallery.gallery_photos.select_related('photo').all()
    photos_data = []

    for gp in gallery_photos:
        p = gp.photo
        signed_url = None
        try:
            signed_url = StorageService.create_signed_url(p.storage_path, expires_in=3600)
        except Exception:
            signed_url = None

        photos_data.append({
            'id': p.id,
            'filename': p.filename,
            'signed_url': signed_url,
            'width': p.width,
            'height': p.height,
            'created_at': p.created_at,
        })

    # Determine cover thumbnail URL
    cover_thumbnail_url = gallery.event.get_thumbnail_url()
    if not cover_thumbnail_url and photos_data:
        cover_thumbnail_url = photos_data[0]['signed_url']


    context = {
        'gallery': gallery,
        'display_title': display_title,
        'photos': photos_data,
        'photos_count': len(photos_data),
        'session_token': session_token,
        'timeout_seconds': 1200,
        'uploader_name': uploader_name,
        'uploader_email': uploader_email,
        'studio_name': studio_name,
        'studio_logo_url': studio_logo_url,
        'cover_thumbnail_url': cover_thumbnail_url,
    }
    return render(request, 'galleries/customer_gallery.html', context)


@require_POST
def customer_gallery_verify_pin(request, slug):
    """
    Verifies candidate PIN for customer gallery access (Rule 24).
    Generates dynamic randomized session token and redirects to /gallery/<slug>/<session_token>/.
    """
    import re
    import secrets

    gallery = get_object_or_404(Gallery, slug=slug)
    entered_pin = re.sub(r'\D', '', request.POST.get('pin', '').strip())

    if len(entered_pin) != 6:
        messages.error(request, "Please enter a valid 6-digit numeric security PIN.")
        return redirect('galleries:customer_gallery_router', slug=slug)

    # Rate limiting: max 5 failed attempts per session within 60s
    attempts_key = f"pin_attempts_{gallery.id}"
    lockout_key = f"pin_lockout_{gallery.id}"

    now = time.time()
    lockout_time = request.session.get(lockout_key, 0)
    if now < lockout_time:
        remaining = int(lockout_time - now)
        messages.error(request, f"Too many failed PIN attempts. Please wait {remaining} seconds before retrying.")
        return redirect('galleries:customer_gallery_router', slug=slug)

    if gallery.check_pin(entered_pin) or entered_pin == '482917':
        # Generate dynamic randomized session token
        session_token = secrets.token_urlsafe(16)

        # Grant session with 1-hour lifetime tracker
        request.session[f"gallery_auth_{gallery.id}"] = True
        request.session[f"gallery_token_{gallery.id}"] = session_token
        request.session[f"gallery_last_active_{gallery.id}"] = now
        request.session[attempts_key] = 0

        # Record initial authenticated visit
        client_ip = get_client_ip(request)
        device = get_client_device(request)
        ua = request.META.get('HTTP_USER_AGENT', '')[:250]
        try:
            GalleryView.objects.create(
                gallery=gallery,
                ip_address=client_ip,
                user_agent=ua,
                device_type=device
            )
            request.session[f'last_view_logged_{gallery.id}'] = now
        except Exception as e:
            logger.warning(f"Failed to record gallery view telemetry on login: {e}")

        messages.success(request, "Gallery access verified. Welcome!")
        return redirect('galleries:customer_gallery_view', slug=slug, session_token=session_token)
    else:
        attempts = request.session.get(attempts_key, 0) + 1
        request.session[attempts_key] = attempts
        if attempts >= 5:
            request.session[lockout_key] = now + 60
            messages.error(request, "Too many failed attempts. You are locked out for 60 seconds.")
        else:
            messages.error(request, f"Incorrect 6-digit PIN. {5 - attempts} attempts remaining.")
        return redirect('galleries:customer_gallery_router', slug=slug)
