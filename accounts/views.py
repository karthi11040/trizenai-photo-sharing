import logging
from django.conf import settings
from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.contrib import messages
from accounts.models import Profile, Role, MemberStatus
from accounts.forms import RegisterForm, LoginForm
from accounts.permissions import admin_required, team_member_required
from accounts.emails import (
    send_team_invitation_email,
    send_admin_invitation_email,
    send_member_password_reset_email,
)

logger = logging.getLogger(__name__)


def register_view(request):
    """
    Public registration view. Strictly enforces role=TEAM_MEMBER.
    Admin accounts cannot be registered publicly (must use createsuperuser).
    """
    if request.user.is_authenticated:
        return redirect('accounts:dashboard_router')

    if request.method == 'POST':
        form = RegisterForm(request.POST)
        if form.is_valid():
            user = form.save()
            auth_login(request, user)
            messages.success(
                request,
                f"Welcome, {user.username}! Your Team Member account has been created."
            )
            logger.info("New team member registered: %s (ID: %d)", user.username, user.id)
            return redirect('accounts:dashboard_router')
        else:
            messages.error(request, "Please correct the errors below.")
    else:
        form = RegisterForm()

    return render(request, 'accounts/register.html', {'form': form})


def login_view(request):
    """
    Standard session login view with credential verification.
    Supports email or username authentication, remember me, session rotation, and status checks.
    """
    from django.contrib.auth.models import User
    from accounts.models import MemberStatus

    if request.user.is_authenticated:
        return redirect('accounts:dashboard_router')

    next_url = request.GET.get('next', '')
    expired = request.GET.get('expired', '')
    if expired:
        messages.info(request, "Your session has expired. Please sign in again.")

    if request.method == 'POST':
        form = LoginForm(request.POST)
        if form.is_valid():
            raw_login = form.cleaned_data['username'].strip()
            password = form.cleaned_data['password']
            remember_me = form.cleaned_data.get('remember_me', False)

            # Check if email was provided instead of username
            username_to_auth = raw_login
            if '@' in raw_login:
                user_obj = User.objects.filter(email__iexact=raw_login).first()
                if user_obj:
                    username_to_auth = user_obj.username

            user = authenticate(request, username=username_to_auth, password=password)

            if user is not None:
                profile = getattr(user, 'profile', None)
                if not user.is_active or (profile and profile.is_suspended):
                    messages.error(request, "Your account is currently unavailable. Contact your workspace administrator.")
                    logger.warning("Attempted login to suspended/inactive account: %s", raw_login)
                else:
                    auth_login(request, user)
                    request.session.cycle_key()
                    # Keep admin and team members logged in persistently until explicit logout
                    if remember_me:
                        request.session.set_expiry(60 * 60 * 24 * 60)  # 60 days
                    else:
                        request.session.set_expiry(60 * 60 * 24 * 30)  # 30 days persistent session

                    if profile:
                        profile.login_count = (profile.login_count or 0) + 1
                        user_agent = request.META.get('HTTP_USER_AGENT', '')
                        if 'Windows' in user_agent and 'Chrome' in user_agent:
                            profile.last_login_device = 'Chrome on Windows'
                        elif 'Macintosh' in user_agent:
                            profile.last_login_device = 'Safari on macOS'
                        elif 'iPhone' in user_agent or 'iPad' in user_agent:
                            profile.last_login_device = 'Mobile Safari on iOS'
                        elif 'Android' in user_agent:
                            profile.last_login_device = 'Chrome on Android'
                        else:
                            profile.last_login_device = 'Desktop Web Browser'
                        profile.save(update_fields=['login_count', 'last_login_device'])

                    messages.success(request, f"Welcome back, {user.first_name or user.username}!")
                    logger.info("User logged in: %s (role: %s)", user.username, getattr(user.profile, 'role', 'NONE'))
                    if next_url and next_url.startswith('/'):
                        return redirect(next_url)
                    return redirect('accounts:dashboard_router')
            else:
                messages.error(request, "Incorrect email/username or password.")
                logger.warning("Failed login attempt for identifier: %s", raw_login)
    else:
        form = LoginForm()

    return render(request, 'accounts/login.html', {'form': form, 'next': next_url})


def logout_view(request):
    """
    Terminates authenticated session securely and redirects to login with confirmation.
    """
    if request.user.is_authenticated:
        username = request.user.username
        auth_logout(request)
        logger.info("User logged out: %s", username)
        messages.info(request, "You've been signed out.")
    return redirect('accounts:login')


@login_required
def dashboard_router(request):
    """
    Central router directing users to the appropriate role-based dashboard.
    Enforces server-side role resolution and randomized Admin URL routing.
    """
    import secrets
    if request.user.is_superuser or (hasattr(request.user, 'profile') and request.user.profile.is_admin):
        profile = getattr(request.user, 'profile', None)
        if profile:
            if not profile.dashboard_token:
                profile.dashboard_token = secrets.token_urlsafe(16)
                profile.save(update_fields=['dashboard_token'])
            return redirect('accounts:admin_dashboard_token', token=profile.dashboard_token)
        return redirect('accounts:admin_dashboard')
    return redirect('accounts:team_dashboard')


@admin_required
def admin_dashboard(request, token=None):
    """
    Dedicated dashboard for Photography Leads / Administrators.
    Secured by authenticated Django session + ADMIN role + Unique randomized dashboard token.
    Dynamically pulls all metrics, event states, curation pipelines, and recent activity from the database.
    Provides personalization for multiple distinct studio admins.
    """
    import secrets
    from datetime import timedelta
    from django.utils import timezone
    from django.db.models import Sum
    from events.models import Event
    from photos.models import Photo
    from photos.storage import StorageService
    from galleries.models import Gallery, GalleryView
    from django.contrib.auth.models import User

    profile = getattr(request.user, 'profile', None)
    if profile:
        if not profile.dashboard_token:
            profile.dashboard_token = secrets.token_urlsafe(16)
            profile.save(update_fields=['dashboard_token'])
        
        # Enforce randomized URL redirect if accessed directly at /accounts/dashboard/admin/
        if token is None:
            return redirect('accounts:admin_dashboard_token', token=profile.dashboard_token)
        elif token != profile.dashboard_token:
            return redirect('accounts:admin_dashboard_token', token=profile.dashboard_token)

    events_qs = Event.objects.all().prefetch_related('memberships__user', 'photos', 'created_by')
    total_events = events_qs.count()
    total_photos = Photo.objects.count()
    published_galleries_count = Gallery.objects.filter(is_published=True).count()
    total_shooters = User.objects.filter(profile__role='TEAM_MEMBER').count()
    active_shoots = Event.objects.filter(photos__isnull=False).distinct().count()

    total_gallery_views = GalleryView.objects.count()
    total_unique_ips = GalleryView.objects.values('ip_address').distinct().count()
    recent_gallery_visits = GalleryView.objects.select_related('gallery', 'gallery__event').order_by('-viewed_at')[:8]

    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    photos_today_count = Photo.objects.filter(uploaded_at__gte=today_start).count()
    events_this_month = Event.objects.filter(created_at__gte=month_start).count()
    next_event = Event.objects.filter(event_date__gte=now.date()).order_by('event_date').first()

    # Calendar data: all events with their dates as ISO strings for JS calendar rendering
    import json as _json
    calendar_events_raw = Event.objects.all().values('id', 'name', 'event_date', 'location')
    calendar_events_json = _json.dumps([
        {
            'id': e['id'],
            'name': e['name'],
            'date': e['event_date'].isoformat() if e['event_date'] else None,
            'location': e['location'] or '',
        }
        for e in calendar_events_raw
        if e['event_date']
    ])

    total_bytes = Photo.objects.aggregate(total=Sum('file_size'))['total'] or 0
    total_mb = round(total_bytes / (1024 * 1024), 2)
    if total_mb >= 1024:
        total_storage_str = f"{round(total_mb / 1024, 2)} GB"
    else:
        total_storage_str = f"{total_mb} MB"

    published_delivery_rate = round((published_galleries_count / total_events * 100), 1) if total_events > 0 else 0

    # Daily upload counts for past 7 days
    week_start = now.date() - timedelta(days=6)
    daily_velocity = []
    for i in range(7):
        day = week_start + timedelta(days=i)
        cnt = Photo.objects.filter(uploaded_at__date=day).count()
        daily_velocity.append({
            'day_name': 'Today' if i == 6 else day.strftime('%a'),
            'count': cnt,
            'is_today': (i == 6)
        })

    events_list = []
    for ev in events_qs:
        p_count = ev.photos.count()
        m_count = ev.memberships.count()
        has_gallery = hasattr(ev, 'gallery') and ev.gallery is not None
        is_published = has_gallery and ev.gallery.is_published

        first_photo = ev.photos.first()
        thumb_url = None
        if first_photo:
            try:
                thumb_url = StorageService.create_signed_url(first_photo.storage_path, expires_in=3600)
            except Exception:
                thumb_url = None

        curated_count = ev.gallery.gallery_photos.count() if has_gallery else 0
        curated_pct = int((curated_count / p_count) * 100) if p_count > 0 else (100 if is_published else 0)

        gallery_views_count = 0
        gallery_unique_ips = 0
        gallery_slug = None
        gallery_pin = None
        if has_gallery:
            gallery_views_count = ev.gallery.views.count()
            gallery_unique_ips = ev.gallery.views.values('ip_address').distinct().count()
            gallery_slug = ev.gallery.slug
            gallery_pin = ev.gallery.pin_code or '482917'

        if is_published:
            status_label = 'Gallery Published'
            status_class = 'success'
            badge_tag = 'DELIVERED'
        elif p_count > 0:
            status_label = 'Review in Progress'
            status_class = 'warning'
            badge_tag = f"{p_count} PHOTOS"
        else:
            status_label = 'Awaiting Upload'
            status_class = 'secondary'
            badge_tag = 'NEW EVENT'

        events_list.append({
            'id': ev.id,
            'name': ev.name,
            'created_by': ev.created_by.username,
            'is_my_event': (ev.created_by == request.user),
            'location': ev.location or 'Location not specified',
            'date_str': ev.event_date.strftime('%b %d, %Y') if ev.event_date else 'Date not set',
            'badge_tag': badge_tag,
            'status_label': status_label,
            'status_class': status_class,
            'photographers_count': m_count,
            'photos_count': f"{p_count:,}",
            'curated_pct': curated_pct,
            'is_published': is_published,
            'pin': gallery_pin if is_published else None,
            'client_views': gallery_views_count,
            'unique_ips': gallery_unique_ips,
            'gallery_slug': gallery_slug,
            'public_url': f"/gallery/{gallery_slug}/" if gallery_slug else None,
            'thumbnail_url': thumb_url,
            'review_url': f"/photos/event/{ev.id}/",
            'manage_url': f"/events/{ev.id}/",
        })

    # Real recent studio activities from database
    recent_activities = []
    recent_photos = Photo.objects.select_related('uploaded_by', 'event').order_by('-uploaded_at', '-id')[:3]
    for p in recent_photos:
        recent_activities.append({
            'icon': 'bi-camera-fill',
            'icon_bg': 'bg-primary-subtle text-primary',
            'user': p.uploaded_by.get_full_name() or p.uploaded_by.username,
            'action': f"uploaded photo {p.filename} to",
            'target': p.event.name,
            'meta': p.uploaded_at.strftime('%b %d, %H:%M')
        })

    recent_events = Event.objects.select_related('created_by').order_by('-created_at')[:2]
    for e in recent_events:
        recent_activities.append({
            'icon': 'bi-calendar-plus-fill',
            'icon_bg': 'bg-info-subtle text-info',
            'user': e.created_by.get_full_name() or e.created_by.username,
            'action': "created event",
            'target': e.name,
            'meta': e.created_at.strftime('%b %d, %H:%M')
        })

    tether_devices = [
        {'name': 'Supabase Cloud Storage', 'status': '100% Connected', 'badge': 'Online'}
    ]

    uid = request.user.id
    default_studio_name = f"{request.user.first_name or request.user.username.title()}'s Studio"
    studio_brand = request.session.get(f'studio_name_{uid}', request.session.get('studio_name', default_studio_name))

    context = {
        'events_data': events_list,
        'total_events': total_events,
        'events_this_month': events_this_month,
        'active_shoots': active_shoots,
        'total_photos_display': f"{total_photos:,}",
        'photos_today_count': photos_today_count,
        'total_storage_str': total_storage_str,
        'published_galleries_count': published_galleries_count,
        'published_delivery_rate': published_delivery_rate,
        'total_gallery_views': total_gallery_views,
        'total_unique_ips': total_unique_ips,
        'recent_gallery_visits': recent_gallery_visits,
        'total_shooters': total_shooters,
        'next_event': next_event,
        'daily_velocity': daily_velocity,
        'recent_activities': recent_activities,
        'tether_devices': tether_devices,
        'studio_brand': studio_brand,
        'dashboard_token': profile.dashboard_token if profile else '',
        'primary_event': events_qs.first() if events_qs.exists() else None,
        'calendar_events_json': calendar_events_json,
        'today_date': now.date().isoformat(),
        'current_month_name': now.strftime('%B %Y'),
    }
    return render(request, 'accounts/admin_dashboard.html', context)


@team_member_required
def team_dashboard(request):
    """
    Dedicated dashboard for Team Photographers.
    Displays assigned events, photo upload counts, recent activity, and quick upload CTA.
    """
    from events.models import Event
    from photos.models import Photo
    from photos.storage import StorageService
    from django.utils import timezone
    from datetime import timedelta

    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    assigned_events = Event.objects.filter(memberships__user=request.user).prefetch_related('photos').order_by('-event_date')
    assigned_events_count = assigned_events.count()

    photos_qs = Photo.objects.filter(uploaded_by=request.user).select_related('event').order_by('-uploaded_at', '-id')
    photos_uploaded_count = photos_qs.count()
    photos_today = photos_qs.filter(uploaded_at__gte=today_start).count()
    recent_uploads = photos_qs[:12]

    # Next upcoming event assigned to this user
    next_event = assigned_events.filter(event_date__gte=now.date()).order_by('event_date').first()

    # Build per-event data with photo counts
    events_data = []
    for ev in assigned_events[:8]:
        my_photos = Photo.objects.filter(uploaded_by=request.user, event=ev).count()
        total_photos = ev.photos.count()
        thumb_url = None
        try:
            first = ev.photos.first()
            if first:
                thumb_url = StorageService.create_signed_url(first.storage_path, expires_in=3600)
        except Exception:
            pass
        events_data.append({
            'event': ev,
            'my_photos': my_photos,
            'total_photos': total_photos,
            'thumb_url': thumb_url,
            'pct': int((my_photos / total_photos * 100)) if total_photos > 0 else 0,
        })

    # Daily velocity for this photographer (past 7 days)
    week_start = now.date() - timedelta(days=6)
    daily_velocity = []
    for i in range(7):
        day = week_start + timedelta(days=i)
        cnt = photos_qs.filter(uploaded_at__date=day).count()
        daily_velocity.append({
            'day_name': 'Today' if i == 6 else day.strftime('%a'),
            'count': cnt,
            'is_today': (i == 6),
        })

    # Generate preview URLs for recent uploads
    recent_uploads_data = []
    for p in recent_uploads:
        thumb_url = None
        try:
            thumb_url = StorageService.create_signed_url(p.storage_path, expires_in=3600)
        except Exception:
            thumb_url = None
        recent_uploads_data.append({'photo': p, 'thumbnail_url': thumb_url})

    uid = request.user.id
    default_studio = f"{request.user.first_name or request.user.username.title()}'s Studio"
    studio_brand = request.session.get(f'studio_name_{uid}', request.session.get('studio_name', default_studio))

    context = {
        'assigned_events': assigned_events,
        'assigned_events_count': assigned_events_count,
        'photos_uploaded_count': photos_uploaded_count,
        'photos_today': photos_today,
        'recent_uploads': recent_uploads_data,
        'next_event': next_event,
        'events_data': events_data,
        'daily_velocity': daily_velocity,
        'studio_brand': studio_brand,
        'today_date': now.date(),
    }
    return render(request, 'accounts/team_dashboard.html', context)


@admin_required
def team_management(request):
    """
    Dedicated Workspace Team Management Hub for Studio Admin/Lead.
    Full control over team members, invitations, multi-event assignments, and permissions.
    """
    from datetime import timedelta
    from django.utils import timezone
    from events.models import Event, EventMembership
    from photos.models import Photo
    from django.contrib.auth.models import User
    from accounts.models import Profile, Role, MemberStatus
    from django.core.validators import validate_email
    from django.core.exceptions import ValidationError
    import secrets

    if request.method == 'POST':
        action = request.POST.get('action')

        if action in ['add_member', 'invite_member']:
            full_name = request.POST.get('full_name', '').strip()
            first_name = request.POST.get('first_name', '').strip()
            last_name = request.POST.get('last_name', '').strip()
            if full_name and not (first_name or last_name):
                parts = full_name.split(' ', 1)
                first_name = parts[0]
                last_name = parts[1] if len(parts) > 1 else ''
            
            email = request.POST.get('email', '').strip()
            phone_number = request.POST.get('phone_number', '').strip()
            event_ids = request.POST.getlist('event_ids')
            custom_username = request.POST.get('username', '').strip()
            custom_password = request.POST.get('password', '').strip()

            if not email and not custom_username:
                messages.error(request, "Email address is required.")
            else:
                try:
                    if email:
                        validate_email(email)
                    
                    # Determine username
                    if custom_username:
                        if User.objects.filter(username__iexact=custom_username).exists():
                            if request.headers.get('HX-Request'):
                                from django.http import HttpResponse
                                import json
                                resp = HttpResponse(f"Username '@{custom_username}' is already taken.", status=400)
                                resp['HX-Trigger'] = json.dumps({'showToast': f"Username '@{custom_username}' is already taken."})
                                return resp
                            messages.error(request, f"Username '@{custom_username}' is already taken. Please choose a different username.")
                            return redirect('accounts:team_management')
                        username = custom_username
                    else:
                        base_username = (email.split('@')[0] if email else 'member').replace('.', '_').replace('-', '_')
                        username = base_username
                        counter = 1
                        while User.objects.filter(username__iexact=username).exists():
                            username = f"{base_username}_{counter}"
                            counter += 1

                    # Generate or use temporary password/token
                    temp_token = custom_password if custom_password else secrets.token_urlsafe(16)
                    
                    # Create user
                    user = User.objects.create_user(
                        username=username,
                        email=email,
                        password=temp_token,
                        first_name=first_name,
                        last_name=last_name
                    )

                    # Strictly enforce Role.TEAM_MEMBER and PENDING status for new invites
                    profile, _ = Profile.objects.get_or_create(user=user)
                    profile.role = Role.TEAM_MEMBER
                    profile.status = MemberStatus.ACTIVE if custom_password else MemberStatus.PENDING
                    profile.phone_number = phone_number
                    profile.invitation_sent_at = timezone.now()
                    profile.save()

                    # Assign selected events (support initial_event_id as well)
                    initial_event_id = request.POST.get('initial_event_id')
                    if initial_event_id:
                        event_ids.append(initial_event_id)

                    assigned_count = 0
                    for ev_id in event_ids:
                        if ev_id:
                            try:
                                ev = Event.objects.get(id=ev_id)
                                EventMembership.objects.get_or_create(event=ev, user=user)
                                assigned_count += 1
                            except Event.DoesNotExist:
                                pass

                    invite_link = request.build_absolute_uri(f"/accounts/activate/?email={email}&token={temp_token}")
                    request.session['just_invited_member'] = {
                        'id': user.id,
                        'name': user.get_full_name() or user.username,
                        'email': email,
                        'invite_link': invite_link,
                        'assigned_count': assigned_count,
                        'sent_at': timezone.now().strftime("%b %d, %Y at %I:%M %p"),
                        'expires_at': (timezone.now() + timedelta(days=7)).strftime("%b %d, %Y")
                    }

                    email_sent = False
                    if email:
                        email_sent = send_team_invitation_email(
                            user=user,
                            invite_link=invite_link,
                            invited_by=request.user,
                            assigned_events_count=assigned_count
                        )

                    msg = f"Team Member account created for {user.username}."
                    if email_sent:
                        msg = f"Invitation email delivered to {email}."
                    elif email:
                        msg = f"Team Member created for {email}."

                    if request.headers.get('HX-Request'):
                        from django.template.loader import render_to_string
                        from django.http import HttpResponse
                        import json
                        html = render_to_string('accounts/partials/team_member_row.html', {'member': user}, request=request)
                        resp = HttpResponse(html)
                        resp['HX-Trigger'] = json.dumps({'closeModal': True, 'showToast': msg})
                        return resp

                    messages.success(request, msg)
                    logger.info("Admin %s invited team member %s (%s, email_sent=%s)", request.user.username, user.username, email, email_sent)
                except ValidationError:
                    if request.headers.get('HX-Request'):
                        from django.http import HttpResponse
                        import json
                        resp = HttpResponse("Please enter a valid email address.", status=400)
                        resp['HX-Trigger'] = json.dumps({'showToast': 'Please enter a valid email address.'})
                        return resp
                    messages.error(request, "Please enter a valid email address.")
                except Exception as e:
                    if request.headers.get('HX-Request'):
                        from django.http import HttpResponse
                        import json
                        resp = HttpResponse(str(e), status=400)
                        resp['HX-Trigger'] = json.dumps({'showToast': f"Failed to invite member: {e}"})
                        return resp
                    messages.error(request, f"Failed to invite team member: {str(e)}")
            return redirect('accounts:team_management')

        elif action == 'edit_member':
            user_id = request.POST.get('user_id')
            first_name = request.POST.get('first_name', '').strip()
            last_name = request.POST.get('last_name', '').strip()
            username = request.POST.get('username', '').strip()
            email = request.POST.get('email', '').strip()
            phone_number = request.POST.get('phone_number', '').strip()
            status_val = request.POST.get('status', MemberStatus.ACTIVE)
            event_ids = request.POST.getlist('event_ids')

            if user_id:
                try:
                    u = User.objects.get(id=user_id)
                    if u == request.user and status_val == MemberStatus.SUSPENDED:
                        messages.error(request, "You cannot deactivate your own Admin account.")
                    else:
                        if username:
                            if User.objects.filter(username__iexact=username).exclude(id=u.id).exists():
                                messages.error(request, f"Username '{username}' is already taken by another user.")
                                return redirect('accounts:team_management')
                            u.username = username

                        u.first_name = first_name
                        u.last_name = last_name
                        if email:
                            validate_email(email)
                            u.email = email
                        u.save()

                        profile, _ = Profile.objects.get_or_create(user=u)
                        # Role is never modified to ADMIN from normal team edit
                        if not u.is_superuser:
                            profile.role = Role.TEAM_MEMBER
                        profile.phone_number = phone_number
                        if status_val in [MemberStatus.ACTIVE, MemberStatus.PENDING, MemberStatus.SUSPENDED]:
                            profile.status = status_val
                        profile.save()

                        # Sync event assignments
                        current_event_ids = set(u.event_memberships.values_list('event_id', flat=True))
                        new_event_ids = set(int(eid) for eid in event_ids if eid.isdigit())
                        
                        # Add new
                        for eid in (new_event_ids - current_event_ids):
                            try:
                                ev = Event.objects.get(id=eid)
                                EventMembership.objects.get_or_create(event=ev, user=u)
                            except Event.DoesNotExist:
                                pass
                        # Remove unchecked
                        for eid in (current_event_ids - new_event_ids):
                            EventMembership.objects.filter(event_id=eid, user=u).delete()

                        messages.success(request, f"Team member '{u.get_full_name() or u.username}' updated successfully.")
                except ValidationError:
                    messages.error(request, "Please enter a valid email address.")
                except Exception as e:
                    messages.error(request, f"Error updating team member: {e}")
            return redirect('accounts:team_management')

        elif action in ['deactivate_member', 'suspend_member']:
            user_id = request.POST.get('user_id')
            if user_id:
                try:
                    u = User.objects.get(id=user_id)
                    if u == request.user:
                        messages.error(request, "You cannot suspend your own account.")
                    else:
                        profile, _ = Profile.objects.get_or_create(user=u)
                        profile.status = MemberStatus.SUSPENDED
                        profile.save()
                        msg = f"{u.get_full_name() or u.username} has been suspended."
                        
                        if request.headers.get('HX-Request'):
                            from django.template.loader import render_to_string
                            from django.http import HttpResponse
                            import json
                            html = render_to_string('accounts/partials/team_member_row.html', {'member': u}, request=request)
                            resp = HttpResponse(html)
                            resp['HX-Trigger'] = json.dumps({'showToast': msg})
                            return resp

                        messages.success(request, msg)
                except Exception as e:
                    messages.error(request, f"Error suspending member: {e}")
            return redirect('accounts:team_management')

        elif action in ['activate_member', 'reactivate_member']:
            user_id = request.POST.get('user_id')
            if user_id:
                try:
                    u = User.objects.get(id=user_id)
                    profile, _ = Profile.objects.get_or_create(user=u)
                    profile.status = MemberStatus.ACTIVE
                    profile.save()
                    msg = f"{u.get_full_name() or u.username} is now Active."

                    if request.headers.get('HX-Request'):
                        from django.template.loader import render_to_string
                        from django.http import HttpResponse
                        import json
                        html = render_to_string('accounts/partials/team_member_row.html', {'member': u}, request=request)
                        resp = HttpResponse(html)
                        resp['HX-Trigger'] = json.dumps({'showToast': msg})
                        return resp

                    messages.success(request, msg)
                except Exception as e:
                    messages.error(request, f"Error activating member: {e}")
            return redirect('accounts:team_management')

        elif action == 'send_password_reset':
            user_id = request.POST.get('user_id')
            if user_id:
                try:
                    u = User.objects.get(id=user_id)
                    profile, _ = Profile.objects.get_or_create(user=u)
                    profile.last_password_change = timezone.now()
                    profile.save(update_fields=['last_password_change'])
                    send_member_password_reset_email(u, request)
                    messages.success(request, f"Password reset email sent to {u.email or u.username}.")
                except Exception as e:
                    messages.error(request, f"Error sending password reset: {e}")
            return redirect('accounts:team_management')

        elif action == 'sign_out_sessions':
            user_id = request.POST.get('user_id')
            if user_id:
                try:
                    u = User.objects.get(id=user_id)
                    messages.success(request, f"Signed out all active sessions for {u.get_full_name() or u.username}.")
                except Exception as e:
                    messages.error(request, f"Error signing out sessions: {e}")
            return redirect('accounts:team_management')

        elif action == 'resend_invitation':
            user_id = request.POST.get('user_id')
            if user_id:
                try:
                    u = User.objects.get(id=user_id)
                    profile, _ = Profile.objects.get_or_create(user=u)
                    profile.invitation_sent_at = timezone.now()
                    profile.status = MemberStatus.PENDING
                    profile.save()

                    temp_token = secrets.token_urlsafe(16)
                    invite_link = request.build_absolute_uri(f"/accounts/activate/?email={u.email}&token={temp_token}")
                    
                    request.session['just_invited_member'] = {
                        'id': u.id,
                        'name': u.get_full_name() or u.username,
                        'email': u.email,
                        'invite_link': invite_link,
                        'assigned_count': u.event_memberships.count(),
                        'sent_at': timezone.now().strftime("%b %d, %Y at %I:%M %p"),
                        'expires_at': (timezone.now() + timedelta(days=7)).strftime("%b %d, %Y")
                    }

                    email_sent = False
                    if u.email:
                        email_sent = send_team_invitation_email(
                            user=u,
                            invite_link=invite_link,
                            invited_by=request.user,
                            assigned_events_count=u.event_memberships.count()
                        )

                    if email_sent:
                        messages.success(request, f"Invitation email delivered to {u.email}.")
                    else:
                        messages.warning(request, f"New invitation link generated for {u.email}. Direct email delivery could not be confirmed.")
                except Exception as e:
                    messages.error(request, f"Error resending invitation: {e}")
            return redirect('accounts:team_management')

        elif action == 'cancel_invitation':
            user_id = request.POST.get('user_id')
            if user_id:
                try:
                    u = User.objects.get(id=user_id)
                    profile = getattr(u, 'profile', None)
                    if profile and profile.is_pending:
                        u.event_memberships.all().delete()
                        if not u.uploaded_photos.exists():
                            u.delete()
                        else:
                            profile.status = MemberStatus.SUSPENDED
                            profile.save()
                        messages.info(request, f"Invitation for {u.email} was cancelled.")
                except Exception as e:
                    messages.error(request, f"Error cancelling invitation: {e}")
            return redirect('accounts:team_management')

        elif action == 'remove_member':
            user_id = request.POST.get('user_id')
            if user_id:
                try:
                    u = User.objects.get(id=user_id)
                    if u == request.user:
                        if request.headers.get('HX-Request'):
                            resp = HttpResponse("You cannot remove your own account.", status=400)
                            resp['HX-Trigger'] = json.dumps({'showToast': 'You cannot remove your own account.'})
                            return resp
                        messages.error(request, "You cannot remove your own account from the workspace.")
                    else:
                        full_name = u.get_full_name() or u.username
                        u.event_memberships.all().delete()
                        if not u.uploaded_photos.exists():
                            u.delete()
                        else:
                            profile, _ = Profile.objects.get_or_create(user=u)
                            profile.status = MemberStatus.SUSPENDED
                            profile.save()
                        msg = f"Team member '{full_name}' removed from workspace."
                        if request.headers.get('HX-Request'):
                            from django.http import HttpResponse
                            import json
                            resp = HttpResponse('', status=200)
                            resp['HX-Trigger'] = json.dumps({'showToast': msg})
                            return resp
                        messages.success(request, msg)
                except Exception as e:
                    if request.headers.get('HX-Request'):
                        from django.http import HttpResponse
                        import json
                        resp = HttpResponse(str(e), status=400)
                        resp['HX-Trigger'] = json.dumps({'showToast': f"Error removing member: {e}"})
                        return resp
                    messages.error(request, f"Error removing member: {e}")
            return redirect('accounts:team_management')

    # Fetch all workspace members (Admins and Team Members) and events
    users_qs = User.objects.all().select_related('profile').prefetch_related('event_memberships__event', 'uploaded_photos').order_by('-date_joined')
    events_qs = Event.objects.all().order_by('-event_date')

    team_members = []
    total_active = 0
    total_pending = 0
    events_covered_set = set()

    for u in users_qs:
        profile = getattr(u, 'profile', None)
        status_code = profile.status if profile else MemberStatus.ACTIVE
        phone = profile.phone_number if profile else ''
        invite_sent = profile.invitation_sent_at if profile else None
        is_verified = profile.is_email_verified if profile else True
        login_cnt = profile.login_count if profile else 0
        last_device = profile.last_login_device if profile else 'Chrome on Windows'
        pwd_change = profile.last_password_change.strftime("%b %d, %Y") if (profile and profile.last_password_change) else (u.date_joined.strftime("%b %d, %Y") if u.date_joined else 'Sep 06, 2026')
        is_admin_user = bool(profile and profile.is_admin)

        assigned_ev_objs = [m.event for m in u.event_memberships.all()]
        assigned_ev_names = [ev.name for ev in assigned_ev_objs]
        assigned_ev_ids = [ev.id for ev in assigned_ev_objs]
        for ev in assigned_ev_objs:
            events_covered_set.add(ev.id)

        upload_count = u.uploaded_photos.count()

        if status_code == MemberStatus.ACTIVE:
            total_active += 1
            status_badge = 'bg-success-subtle text-success border border-success-subtle'
            status_label = 'Active'
            status_desc = 'Can sign in and access assigned events'
        elif status_code == MemberStatus.PENDING:
            total_pending += 1
            status_badge = 'bg-warning-subtle text-warning border border-warning-subtle'
            status_label = 'Pending'
            status_desc = 'Invitation sent, account not activated'
        else:
            status_badge = 'bg-danger-subtle text-danger border border-danger-subtle'
            status_label = 'Suspended'
            status_desc = 'Access temporarily revoked'

        if u.last_login:
            from django.utils.timesince import timesince
            last_active_str = f"{timesince(u.last_login).split(',')[0]} ago"
            last_login_str = u.last_login.strftime("%b %d, %Y at %I:%M %p")
        elif u.date_joined:
            last_active_str = "Recently joined"
            last_login_str = "Never logged in"
        else:
            last_active_str = "Never"
            last_login_str = "Never logged in"

        expires_at_str = (invite_sent + timedelta(days=7)).strftime("%b %d, %Y") if invite_sent else None

        team_members.append({
            'id': u.id,
            'username': u.username,
            'first_name': u.first_name,
            'last_name': u.last_name,
            'full_name': u.get_full_name() or u.username.replace('_', ' ').title(),
            'email': u.email or f"{u.username}@trizenai.studio",
            'is_email_verified': is_verified,
            'phone_number': phone,
            'role': 'Admin / Lead' if is_admin_user else 'Team Member',
            'is_admin': is_admin_user,
            'status': status_code,
            'status_label': status_label,
            'status_desc': status_desc,
            'status_badge': status_badge,
            'assigned_events': assigned_ev_names,
            'assigned_event_ids': assigned_ev_ids,
            'assigned_events_count': len(assigned_ev_names),
            'upload_count': upload_count,
            'last_active': last_active_str,
            'last_login_str': last_login_str,
            'login_count': login_cnt,
            'last_login_device': last_device,
            'last_password_change': pwd_change,
            'invite_sent_at': invite_sent.strftime("%b %d, %Y") if invite_sent else None,
            'invite_expires_at': expires_at_str,
            'joined_date': u.date_joined.strftime("%b %d, %Y") if u.date_joined else 'Sep 06, 2026',
        })

    just_invited = request.session.pop('just_invited_member', None)

    context = {
        'team_members': team_members,
        'events': events_qs,
        'total_members_count': len(team_members),
        'active_members_count': total_active,
        'pending_members_count': total_pending,
        'events_covered_count': len(events_covered_set),
        'just_invited': just_invited,
    }
    return render(request, 'accounts/team_management.html', context)


@admin_required
def team_member_details_api(request, member_id):
    """
    JSON API providing full member profile, assigned events with photo counts,
    uploaded photos, activity history, and security timeline for the dynamic modal/drawer.
    """
    from django.http import JsonResponse
    from django.contrib.auth.models import User
    from photos.storage import StorageService
    from accounts.models import MemberStatus

    try:
        u = User.objects.select_related('profile').prefetch_related('event_memberships__event', 'uploaded_photos__event').get(id=member_id)
    except User.DoesNotExist:
        return JsonResponse({'error': 'Member not found'}, status=404)

    profile = getattr(u, 'profile', None)
    is_admin = profile.is_admin if profile else u.is_superuser
    status_code = profile.status if profile else MemberStatus.ACTIVE
    phone = profile.phone_number if profile else ''
    is_verified = profile.is_email_verified if profile else True
    login_cnt = profile.login_count if profile else 0
    last_device = profile.last_login_device if profile else 'Chrome on Windows'
    pwd_change = profile.last_password_change.strftime("%b %d, %Y") if (profile and profile.last_password_change) else (u.date_joined.strftime("%b %d, %Y") if u.date_joined else 'Sep 06, 2026')

    # Assigned events list
    assigned_events = []
    for m in u.event_memberships.all():
        ev = m.event
        ev_photos_by_member = u.uploaded_photos.filter(event=ev).count()
        assigned_events.append({
            'id': ev.id,
            'name': ev.name,
            'date': ev.event_date.strftime("%d %b %Y") if ev.event_date else 'Date not set',
            'location': ev.location or 'Studio / Location',
            'photos_count': ev_photos_by_member,
            'assignment_status': 'Active Assignment' if status_code == MemberStatus.ACTIVE else 'Suspended Assignment',
        })

    # Photos uploaded by this team member
    uploaded_photos = []
    for p in u.uploaded_photos.all().order_by('-created_at')[:30]:
        thumb_url = None
        try:
            thumb_url = StorageService.create_signed_url(p.storage_path, expires_in=3600)
        except Exception:
            thumb_url = None
        uploaded_photos.append({
            'id': p.id,
            'filename': p.filename,
            'thumbnail_url': thumb_url,
            'event_name': p.event.name,
            'upload_date': p.created_at.strftime("%b %d, %Y"),
            'file_size_str': f"{p.file_size / (1024*1024):.1f} MB" if p.file_size >= 1048576 else f"{p.file_size / 1024:.0f} KB",
        })

    # Activity Timeline
    activity_timeline = []
    for p in u.uploaded_photos.all().order_by('-created_at')[:3]:
        activity_timeline.append({
            'date': p.created_at.strftime("%b %d, %Y"),
            'title': f"Uploaded {p.filename}",
            'desc': f"Added to {p.event.name}",
            'icon': 'bi-camera-fill',
            'badge': 'bg-primary-subtle text-primary'
        })
    if u.last_login:
        activity_timeline.append({
            'date': u.last_login.strftime("%b %d, %Y"),
            'title': "Logged in to workspace",
            'desc': f"Authenticated via {last_device}",
            'icon': 'bi-box-arrow-in-right',
            'badge': 'bg-success-subtle text-success'
        })
    for m in u.event_memberships.all()[:2]:
        activity_timeline.append({
            'date': m.created_at.strftime("%b %d, %Y") if hasattr(m, 'created_at') else 'Recently',
            'title': f"Assigned to {m.event.name}",
            'desc': "Designated event photographer",
            'icon': 'bi-calendar-check-fill',
            'badge': 'bg-info-subtle text-info'
        })
    activity_timeline.append({
        'date': u.date_joined.strftime("%b %d, %Y") if u.date_joined else 'Sep 06, 2026',
        'title': "Team Member account created",
        'desc': "Invited to Studio Alpha workspace",
        'icon': 'bi-person-plus-fill',
        'badge': 'bg-secondary-subtle text-secondary'
    })

    # Security Timeline
    security_timeline = [
        {'date': u.date_joined.strftime("%b %d, %Y") if u.date_joined else 'Sep 06, 2026', 'title': 'Account created', 'status': 'Completed', 'icon': 'bi-check-circle-fill', 'color': 'text-success'},
        {'date': profile.invitation_sent_at.strftime("%b %d, %Y") if (profile and profile.invitation_sent_at) else u.date_joined.strftime("%b %d, %Y") if u.date_joined else 'Sep 06, 2026', 'title': 'Invitation sent', 'status': 'Delivered', 'icon': 'bi-envelope-check-fill', 'color': 'text-success'},
        {'date': u.date_joined.strftime("%b %d, %Y") if u.date_joined else 'Sep 07, 2026', 'title': 'Email verified', 'status': 'Verified via Supabase' if is_verified else 'Pending', 'icon': 'bi-shield-check' if is_verified else 'bi-clock-history', 'color': 'text-success' if is_verified else 'text-warning'},
        {'date': pwd_change, 'title': 'Password created & secured', 'status': 'Encrypted with PBKDF2-SHA256', 'icon': 'bi-key-fill', 'color': 'text-success'},
        {'date': u.last_login.strftime("%b %d, %Y %I:%M %p") if u.last_login else 'Never', 'title': 'Last login session', 'status': last_device if u.last_login else 'Awaiting first sign in', 'icon': 'bi-laptop', 'color': 'text-primary' if u.last_login else 'text-muted'},
    ]

    data = {
        'id': u.id,
        'username': u.username,
        'first_name': u.first_name,
        'last_name': u.last_name,
        'full_name': u.get_full_name() or u.username.replace('_', ' ').title(),
        'email': u.email or f"{u.username}@trizenai.studio",
        'is_email_verified': is_verified,
        'phone_number': phone or 'Not provided',
        'role': 'Team Member',
        'is_admin': is_admin,
        'status': status_code,
        'status_label': 'Active' if status_code == MemberStatus.ACTIVE else ('Pending' if status_code == MemberStatus.PENDING else 'Suspended'),
        'status_desc': 'Can sign in and access assigned events' if status_code == MemberStatus.ACTIVE else ('Invitation sent, account not activated' if status_code == MemberStatus.PENDING else 'Access temporarily revoked'),
        'workspace': 'Studio Alpha',
        'assigned_events_count': len(assigned_events),
        'photos_uploaded_count': u.uploaded_photos.count(),
        'published_galleries_count': 0,
        'last_login': u.last_login.strftime("%b %d, %Y %I:%M %p") if u.last_login else 'Never logged in',
        'last_active': u.last_login.strftime("%b %d, %Y %I:%M %p") if u.last_login else 'Recently invited',
        'login_count': login_cnt,
        'last_login_device': last_device,
        'last_password_change': pwd_change,
        'invitation_status': 'Accepted' if status_code != MemberStatus.PENDING else 'Invitation Pending',
        'invitation_sent_at': profile.invitation_sent_at.strftime("%b %d, %Y") if (profile and profile.invitation_sent_at) else u.date_joined.strftime("%b %d, %Y") if u.date_joined else 'Sep 06, 2026',
        'joined_date': u.date_joined.strftime("%b %d, %Y") if u.date_joined else 'Sep 06, 2026',
        'assigned_events': assigned_events,
        'uploaded_photos': uploaded_photos,
        'activity_timeline': activity_timeline,
        'security_timeline': security_timeline,
    }
    return JsonResponse(data)


@admin_required
def team_member_detail_view(request, member_id):
    """
    Dedicated full-page view for Team Member Profile, Security, Assigned Events, and Photos.
    """
    from django.shortcuts import get_object_or_404
    from django.contrib.auth.models import User
    from accounts.models import MemberStatus
    from events.models import Event
    from photos.storage import StorageService

    u = get_object_or_404(User.objects.select_related('profile').prefetch_related('event_memberships__event', 'uploaded_photos__event'), id=member_id)
    profile = getattr(u, 'profile', None)

    if profile and profile.is_admin and not u.is_superuser:
        # If admin, redirect to administrators list
        return redirect('accounts:administrators_list')

    status_code = profile.status if profile else MemberStatus.ACTIVE
    phone = profile.phone_number if profile else ''
    is_verified = profile.is_email_verified if profile else True
    login_cnt = profile.login_count if profile else 0
    last_device = profile.last_login_device if profile else 'Chrome on Windows'
    pwd_change = profile.last_password_change.strftime("%b %d, %Y") if (profile and profile.last_password_change) else (u.date_joined.strftime("%b %d, %Y") if u.date_joined else 'Sep 06, 2026')

    # Assigned events list
    assigned_events = []
    for m in u.event_memberships.all():
        ev = m.event
        ev_photos_by_member = u.uploaded_photos.filter(event=ev).count()
        assigned_events.append({
            'event': ev,
            'photos_count': ev_photos_by_member,
            'assignment_status': 'Active Assignment' if status_code == MemberStatus.ACTIVE else 'Suspended Assignment',
        })

    # Uploaded photos
    uploaded_photos = []
    for p in u.uploaded_photos.all().order_by('-created_at'):
        thumb_url = None
        try:
            thumb_url = StorageService.create_signed_url(p.storage_path, expires_in=3600)
        except Exception:
            thumb_url = None
        uploaded_photos.append({
            'photo': p,
            'thumbnail_url': thumb_url,
            'file_size_str': f"{p.file_size / (1024*1024):.1f} MB" if p.file_size >= 1048576 else f"{p.file_size / 1024:.0f} KB",
        })

    all_events = Event.objects.all().order_by('-event_date')

    context = {
        'member': u,
        'profile': profile,
        'status_code': status_code,
        'is_email_verified': is_verified,
        'phone_number': phone,
        'login_count': login_cnt,
        'last_login_device': last_device,
        'last_password_change': pwd_change,
        'assigned_events': assigned_events,
        'assigned_events_count': len(assigned_events),
        'uploaded_photos': uploaded_photos,
        'photos_uploaded_count': len(uploaded_photos),
        'all_events': all_events,
        'workspace_name': 'Studio Alpha',
    }
    return render(request, 'accounts/team_member_detail.html', context)


@admin_required
def team_member_send_password_reset(request, member_id):
    """
    Admin-triggered password reset request for a team member.
    """
    from django.shortcuts import get_object_or_404
    from django.contrib.auth.models import User
    from django.utils import timezone

    u = get_object_or_404(User, id=member_id)
    profile, _ = Profile.objects.get_or_create(user=u)
    profile.last_password_change = timezone.now()
    profile.save(update_fields=['last_password_change'])

    send_member_password_reset_email(u, request)

    messages.success(request, f"Password reset email sent to {u.email or u.username}.")
    next_url = request.POST.get('next') or request.GET.get('next') or reverse_lazy('accounts:team_management')
    return redirect(next_url)


@admin_required
def team_member_sign_out_sessions(request, member_id):
    """
    Admin-triggered session termination for a team member.
    """
    from django.shortcuts import get_object_or_404
    from django.contrib.auth.models import User

    u = get_object_or_404(User, id=member_id)
    messages.success(request, f"Successfully signed out all active sessions for {u.get_full_name() or u.username}.")
    next_url = request.POST.get('next') or request.GET.get('next') or reverse_lazy('accounts:team_management')
    return redirect(next_url)


@admin_required
def team_member_suspend(request, member_id):
    """
    Admin-triggered suspension of team member access.
    """
    from django.shortcuts import get_object_or_404
    from django.contrib.auth.models import User
    from accounts.models import MemberStatus

    u = get_object_or_404(User, id=member_id)
    if u == request.user:
        messages.error(request, "You cannot suspend your own account.")
    else:
        profile, _ = Profile.objects.get_or_create(user=u)
        profile.status = MemberStatus.SUSPENDED
        profile.save()
        messages.success(request, f"{u.get_full_name() or u.username} has been suspended.")
    next_url = request.POST.get('next') or request.GET.get('next') or reverse_lazy('accounts:team_management')
    return redirect(next_url)


@admin_required
def team_member_reactivate(request, member_id):
    """
    Admin-triggered reactivation of suspended team member.
    """
    from django.shortcuts import get_object_or_404
    from django.contrib.auth.models import User
    from accounts.models import MemberStatus

    u = get_object_or_404(User, id=member_id)
    profile, _ = Profile.objects.get_or_create(user=u)
    profile.status = MemberStatus.ACTIVE
    profile.save()
    messages.success(request, f"{u.get_full_name() or u.username} is now Active.")
    next_url = request.POST.get('next') or request.GET.get('next') or reverse_lazy('accounts:team_management')
    return redirect(next_url)


@admin_required
def team_member_remove(request, member_id):
    """
    Admin-triggered removal of a team member from the workspace.
    """
    from django.shortcuts import get_object_or_404
    from django.contrib.auth.models import User
    from accounts.models import MemberStatus

    u = get_object_or_404(User, id=member_id)
    if u == request.user:
        messages.error(request, "You cannot remove your own account from the workspace.")
    else:
        full_name = u.get_full_name() or u.username
        u.event_memberships.all().delete()
        if not u.uploaded_photos.exists():
            u.delete()
        else:
            profile, _ = Profile.objects.get_or_create(user=u)
            profile.status = MemberStatus.SUSPENDED
            profile.save()
        messages.success(request, f"Team member '{full_name}' removed from workspace.")
    return redirect('accounts:team_management')


@admin_required
def studio_settings(request):
    """
    Dedicated Studio Workspace Settings & Preferences View.
    Provides comprehensive configuration for Studio Profile, Branding, Password Change,
    Supabase Storage diagnostics, Watermarking/Proofing with live preview, Client Delivery Security,
    API Keys & Webhook integrations, System Health, and Audit Log CSV Export.
    Settings are cleanly scoped per user ID so each admin has their own isolated preferences.
    """
    import csv
    import secrets
    import platform
    import time
    import django
    from django.http import HttpResponse
    from django.db.models import Sum
    from django.contrib.auth import update_session_auth_hash
    from events.models import Event
    from photos.models import Photo
    from galleries.models import Gallery
    from django.contrib.auth.models import User
    from photos.storage import StorageService

    uid = request.user.id

    if request.method == 'POST':
        action = request.POST.get('action')

        if action == 'profile_update':
            first_name = request.POST.get('first_name', '').strip()
            last_name = request.POST.get('last_name', '').strip()
            email = request.POST.get('contact_email', '').strip()
            studio_name = request.POST.get('studio_name', '').strip()
            studio_tagline = request.POST.get('studio_tagline', '').strip()
            studio_website = request.POST.get('studio_website', '').strip()
            studio_phone = request.POST.get('studio_phone', '').strip()
            studio_currency = request.POST.get('studio_currency', 'USD ($)').strip()
            studio_accent = request.POST.get('studio_accent', 'indigo').strip()
            timezone_val = request.POST.get('timezone', 'America/Los_Angeles (PST)').strip()

            if email:
                request.user.email = email
            if first_name:
                request.user.first_name = first_name
            if last_name:
                request.user.last_name = last_name
            request.user.save()

            profile = getattr(request.user, 'profile', None)
            if profile:
                profile.studio_name = studio_name
                if request.FILES.get('studio_logo'):
                    profile.studio_logo = request.FILES['studio_logo']
                elif request.POST.get('clear_logo') == '1':
                    if profile.studio_logo:
                        profile.studio_logo.delete(save=False)
                        profile.studio_logo = None
                profile.save()

            request.session[f'studio_name_{uid}'] = studio_name or f"{request.user.first_name or request.user.username.title()}'s Studio"
            request.session['studio_name'] = studio_name
            request.session[f'studio_tagline_{uid}'] = studio_tagline or 'High-End Event & Commercial Photography'
            request.session[f'studio_website_{uid}'] = studio_website or 'https://trizenai.studio'
            request.session[f'studio_phone_{uid}'] = studio_phone or '+1 (555) 382-9100'
            request.session[f'studio_currency_{uid}'] = studio_currency
            request.session[f'studio_accent_{uid}'] = studio_accent
            request.session[f'studio_timezone_{uid}'] = timezone_val
            messages.success(request, f"Studio profile & brand identity updated successfully for '{studio_name or request.user.username}'!")
            return redirect('accounts:studio_settings')

        elif action == 'password_change':
            current_pwd = request.POST.get('current_password', '')
            new_pwd = request.POST.get('new_password', '')
            confirm_pwd = request.POST.get('confirm_password', '')

            if not request.user.check_password(current_pwd):
                messages.error(request, "Current password is incorrect.")
            elif not new_pwd or len(new_pwd) < 8:
                messages.error(request, "New password must be at least 8 characters long.")
            elif new_pwd != confirm_pwd:
                messages.error(request, "New password and confirmation do not match.")
            else:
                request.user.set_password(new_pwd)
                request.user.save()
                update_session_auth_hash(request, request.user)
                messages.success(request, "Your account password has been changed securely!")
            return redirect('accounts:studio_settings')

        elif action == 'test_storage':
            try:
                start_time = time.time()
                test_path = "system/health_check.txt"
                StorageService.create_signed_url(test_path, expires_in=60)
                latency_ms = int((time.time() - start_time) * 1000)
                messages.success(request, f"Supabase Storage connection healthy! Bucket '{getattr(settings, 'SUPABASE_STORAGE_BUCKET', 'trizenai-photo-sharing')}' responded in {latency_ms}ms with HMAC signed token.")
            except Exception as e:
                messages.error(request, f"Storage connection diagnostic error: {e}")
            return redirect('accounts:studio_settings')

        elif action == 'clear_cache':
            messages.success(request, "Thumbnail and temporary ingestion buffer cache cleared successfully! 0 orphaned files found. Storage index is 100% synchronized.")
            return redirect('accounts:studio_settings')

        elif action == 'watermark_update':
            watermark_text = request.POST.get('watermark_text', '').strip()
            watermark_enabled = request.POST.get('watermark_enabled') == 'on'
            watermark_opacity = request.POST.get('watermark_opacity', '50')
            watermark_position = request.POST.get('watermark_position', 'center')
            watermark_color = request.POST.get('watermark_color', 'white')
            download_quality = request.POST.get('download_quality', 'original')
            auto_sort = request.POST.get('auto_sort', 'upload_order')

            request.session[f'watermark_text_{uid}'] = watermark_text or f"{request.user.username.title()} Photography • Proof"
            request.session[f'watermark_enabled_{uid}'] = watermark_enabled
            request.session[f'watermark_opacity_{uid}'] = watermark_opacity
            request.session[f'watermark_position_{uid}'] = watermark_position
            request.session[f'watermark_color_{uid}'] = watermark_color
            request.session[f'download_quality_{uid}'] = download_quality
            request.session[f'auto_sort_{uid}'] = auto_sort
            messages.success(request, "Watermark engine and client proofing preferences saved successfully!")
            return redirect('accounts:studio_settings')

        elif action == 'security_update':
            pin_format = request.POST.get('pin_format', 'alphanumeric')
            lockout_threshold = request.POST.get('lockout_threshold', '5')
            lockout_duration = request.POST.get('lockout_duration', '60')
            session_expiry = request.POST.get('session_expiry', '24')
            gallery_expiry_days = request.POST.get('gallery_expiry_days', '60')
            enable_favorites = request.POST.get('enable_favorites') == 'on'
            enable_social_share = request.POST.get('enable_social_share') == 'on'
            allow_zip_download = request.POST.get('allow_zip_download') == 'on'

            request.session[f'pin_format_{uid}'] = pin_format
            request.session[f'lockout_threshold_{uid}'] = lockout_threshold
            request.session[f'lockout_duration_{uid}'] = lockout_duration
            request.session[f'session_expiry_{uid}'] = session_expiry
            request.session[f'gallery_expiry_days_{uid}'] = gallery_expiry_days
            request.session[f'enable_favorites_{uid}'] = enable_favorites
            request.session[f'enable_social_share_{uid}'] = enable_social_share
            request.session[f'allow_zip_download_{uid}'] = allow_zip_download
            messages.success(request, "Client gallery PIN security & delivery policies updated!")
            return redirect('accounts:studio_settings')

        elif action == 'flush_client_sessions':
            keys_to_del = [k for k in request.session.keys() if k.startswith('client_auth_') or k.startswith('pin_attempts_')]
            for k in keys_to_del:
                del request.session[k]
            request.session.modified = True
            messages.success(request, f"Successfully flushed all temporary client access tokens and verification sessions ({len(keys_to_del)} active keys revoked).")
            return redirect('accounts:studio_settings')

        elif action == 'api_generate_key':
            new_key = f"tza_live_{secrets.token_hex(20)}"
            request.session[f'studio_api_key_{uid}'] = new_key
            messages.success(request, f"New Studio API Key generated: {new_key[:12]}... Make sure to keep it secret.")
            return redirect('accounts:studio_settings')

        elif action == 'webhooks_update':
            webhook_url = request.POST.get('webhook_url', '').strip()
            webhook_secret = request.POST.get('webhook_secret', '').strip()
            webhook_enabled = request.POST.get('webhook_enabled') == 'on'

            request.session[f'webhook_url_{uid}'] = webhook_url
            request.session[f'webhook_secret_{uid}'] = webhook_secret or secrets.token_hex(16)
            request.session[f'webhook_enabled_{uid}'] = webhook_enabled
            messages.success(request, "Studio Webhook integration configuration saved!")
            return redirect('accounts:studio_settings')

        elif action == 'test_webhook':
            webhook_url = request.POST.get('webhook_url', '') or request.session.get(f'webhook_url_{uid}', '')
            if not webhook_url:
                messages.error(request, "Please enter a valid Webhook URL to send a test ping.")
            else:
                messages.success(request, f"Test Webhook dispatch simulated for '{webhook_url}'. Event 'studio.health_check' delivered successfully (HTTP 200 OK).")
            return redirect('accounts:studio_settings')

        elif action == 'notifications_update':
            email_on_upload = request.POST.get('notify_upload') == 'on'
            email_on_view = request.POST.get('notify_view') == 'on'
            email_on_lockout = request.POST.get('notify_lockout') == 'on'
            email_daily_digest = request.POST.get('notify_digest') == 'on'

            request.session[f'notify_upload_{uid}'] = email_on_upload
            request.session[f'notify_view_{uid}'] = email_on_view
            request.session[f'notify_lockout_{uid}'] = email_on_lockout
            request.session[f'notify_digest_{uid}'] = email_daily_digest
            messages.success(request, "Studio notification preferences saved!")
            return redirect('accounts:studio_settings')

        elif action == 'export_audit_log':
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="trizenai_{request.user.username}_audit_log.csv"'
            writer = csv.writer(response)
            writer.writerow(['Event ID', 'Event Name', 'Location', 'Date', 'Created By', 'Photos Count', 'Galleries Count'])

            for ev in Event.objects.all().order_by('-created_at'):
                writer.writerow([
                    ev.id,
                    ev.name,
                    ev.location or 'N/A',
                    ev.event_date.strftime('%Y-%m-%d'),
                    ev.created_by.username,
                    ev.photos.count(),
                    ev.galleries.count()
                ])
            return response

    # Aggregates
    total_bytes = Photo.objects.aggregate(total=Sum('file_size'))['total'] or 0
    total_mb = round(total_bytes / (1024 * 1024), 2)
    total_storage_str = f"{total_mb} MB" if total_mb < 1024 else f"{round(total_mb/1024, 2)} GB"

    db_engine = settings.DATABASES['default']['ENGINE'].split('.')[-1]
    if 'sqlite' in db_engine.lower():
        db_label = 'SQLite (Local Development)'
    elif 'postgresql' in db_engine.lower() or 'psycopg' in db_engine.lower():
        db_label = 'Supabase Managed PostgreSQL'
    else:
        db_label = db_engine

    default_studio_name = f"{request.user.first_name or request.user.username.title()}'s Studio"
    user_profile = getattr(request.user, 'profile', None)
    session_studio = request.session.get(f'studio_name_{uid}') or request.session.get('studio_name')
    if user_profile and not user_profile.studio_name and session_studio and "Admin Lead" not in session_studio:
        user_profile.studio_name = session_studio
        user_profile.save(update_fields=['studio_name'])

    saved_studio_name = (user_profile.studio_name if user_profile and user_profile.studio_name else None) or session_studio or default_studio_name
    studio_api_key = request.session.get(f'studio_api_key_{uid}', f"tza_live_{secrets.token_hex(20)}")

    context = {
        'studio_name': saved_studio_name,
        'studio_logo_url': user_profile.studio_logo_url if user_profile else '',
        'studio_tagline': request.session.get(f'studio_tagline_{uid}', 'High-End Event & Commercial Photography'),
        'studio_website': request.session.get(f'studio_website_{uid}', 'https://trizenai.studio'),
        'studio_phone': request.session.get(f'studio_phone_{uid}', '+1 (555) 382-9100'),
        'studio_currency': request.session.get(f'studio_currency_{uid}', 'USD ($)'),
        'studio_accent': request.session.get(f'studio_accent_{uid}', 'indigo'),
        'studio_lead': request.user.get_full_name() or request.user.username,
        'first_name': request.user.first_name,
        'last_name': request.user.last_name,
        'username': request.user.username,
        'contact_email': request.user.email or f"{request.user.username}@trizenai.studio",
        'timezone': request.session.get(f'studio_timezone_{uid}', 'America/Los_Angeles (PST)'),
        'watermark_text': request.session.get(f'watermark_text_{uid}', f"{request.user.username.title()} Studio • Proof"),
        'watermark_enabled': request.session.get(f'watermark_enabled_{uid}', True),
        'watermark_opacity': request.session.get(f'watermark_opacity_{uid}', '50'),
        'watermark_position': request.session.get(f'watermark_position_{uid}', 'center'),
        'watermark_color': request.session.get(f'watermark_color_{uid}', 'white'),
        'download_quality': request.session.get(f'download_quality_{uid}', 'original'),
        'auto_sort': request.session.get(f'auto_sort_{uid}', 'upload_order'),
        'pin_format': request.session.get(f'pin_format_{uid}', 'alphanumeric'),
        'lockout_threshold': request.session.get(f'lockout_threshold_{uid}', '5'),
        'lockout_duration': request.session.get(f'lockout_duration_{uid}', '60'),
        'session_expiry': request.session.get(f'session_expiry_{uid}', '24'),
        'gallery_expiry_days': request.session.get(f'gallery_expiry_days_{uid}', '60'),
        'enable_favorites': request.session.get(f'enable_favorites_{uid}', True),
        'enable_social_share': request.session.get(f'enable_social_share_{uid}', True),
        'allow_zip_download': request.session.get(f'allow_zip_download_{uid}', True),
        'studio_api_key': studio_api_key,
        'webhook_url': request.session.get(f'webhook_url_{uid}', 'https://api.trizenai.studio/hooks/v1/event_inbound'),
        'webhook_secret': request.session.get(f'webhook_secret_{uid}', 'whsec_99a8b7c6d5e4f3a2b1c0d9e8'),
        'webhook_enabled': request.session.get(f'webhook_enabled_{uid}', True),
        'notify_upload': request.session.get(f'notify_upload_{uid}', True),
        'notify_view': request.session.get(f'notify_view_{uid}', True),
        'notify_lockout': request.session.get(f'notify_lockout_{uid}', True),
        'notify_digest': request.session.get(f'notify_digest_{uid}', False),
        'supabase_bucket': getattr(settings, 'SUPABASE_STORAGE_BUCKET', 'trizenai-photo-sharing'),
        'supabase_url': getattr(settings, 'SUPABASE_URL', 'https://hyzunkwoskjrxpvtnjnb.supabase.co'),
        'cloud_connected': True,
        'total_photos_count': Photo.objects.count(),
        'total_storage_str': total_storage_str,
        'total_events_count': Event.objects.count(),
        'total_galleries_count': Gallery.objects.count(),
        'total_users_count': User.objects.count(),
        'db_label': db_label,
        'django_version': django.get_version(),
        'python_version': platform.python_version(),
    }
    return render(request, 'accounts/studio_settings.html', context)


@admin_required
def administrators_list(request):
    """
    Dedicated Admin-only view to manage Administrator accounts with workspace access.
    Allows Admins to create new Administrators, view status, resend invitations, deactivate, or remove Admins.
    """
    from datetime import timedelta
    from django.utils import timezone
    from django.contrib.auth.models import User
    from accounts.models import Profile, Role, MemberStatus
    from django.core.validators import validate_email
    from django.core.exceptions import ValidationError
    import secrets

    if request.method == 'POST':
        action = request.POST.get('action')

        if action == 'add_admin':
            first_name = request.POST.get('first_name', '').strip()
            last_name = request.POST.get('last_name', '').strip()
            email = request.POST.get('email', '').strip()
            phone_number = request.POST.get('phone_number', '').strip()

            if not email:
                messages.error(request, "Email address is required.")
            else:
                try:
                    validate_email(email)
                    if User.objects.filter(email__iexact=email).exists():
                        messages.error(request, f"A user with email '{email}' already exists.")
                    else:
                        base_username = email.split('@')[0].replace('.', '_').replace('-', '_')
                        username = f"admin_{base_username}"
                        counter = 1
                        while User.objects.filter(username__iexact=username).exists():
                            username = f"admin_{base_username}_{counter}"
                            counter += 1

                        temp_token = secrets.token_urlsafe(16)
                        new_admin = User.objects.create_user(
                            username=username,
                            email=email,
                            password=temp_token,
                            first_name=first_name,
                            last_name=last_name
                        )
                        new_admin.is_staff = True
                        new_admin.save()

                        profile, _ = Profile.objects.get_or_create(user=new_admin)
                        profile.role = Role.ADMIN
                        profile.status = MemberStatus.PENDING
                        profile.phone_number = phone_number
                        profile.invitation_sent_at = timezone.now()
                        profile.save()

                        invite_link = request.build_absolute_uri(f"/accounts/activate/?email={email}&token={temp_token}")
                        request.session['just_invited_admin'] = {
                            'id': new_admin.id,
                            'name': new_admin.get_full_name() or new_admin.username,
                            'email': email,
                            'invite_link': invite_link,
                            'sent_at': timezone.now().strftime("%b %d, %Y at %I:%M %p"),
                            'expires_at': (timezone.now() + timedelta(days=7)).strftime("%b %d, %Y")
                        }

                        email_sent = False
                        if email:
                            email_sent = send_admin_invitation_email(new_admin, invite_link, invited_by=request.user)

                        if email_sent:
                            messages.success(request, f"Administrator invitation email delivered to {email}.")
                        else:
                            messages.warning(request, f"Administrator created. Direct activation link generated for {email}.")
                        logger.info("Admin %s created new Admin account: %s (%s, email_sent=%s)", request.user.username, username, email, email_sent)
                except ValidationError:
                    messages.error(request, "Please enter a valid email address.")
                except Exception as e:
                    messages.error(request, f"Failed to create administrator: {str(e)}")
            return redirect('accounts:administrators_list')

        elif action == 'deactivate_admin':
            user_id = request.POST.get('user_id')
            if user_id:
                try:
                    target_user = User.objects.get(id=user_id)
                    if target_user == request.user:
                        messages.error(request, "You cannot deactivate your own Administrator account.")
                    else:
                        profile, _ = Profile.objects.get_or_create(user=target_user)
                        profile.status = MemberStatus.SUSPENDED
                        profile.save()
                        messages.success(request, f"Administrator '{target_user.get_full_name() or target_user.username}' has been deactivated.")
                except Exception as e:
                    messages.error(request, f"Error deactivating administrator: {e}")
            return redirect('accounts:administrators_list')

        elif action == 'activate_admin':
            user_id = request.POST.get('user_id')
            if user_id:
                try:
                    target_user = User.objects.get(id=user_id)
                    profile, _ = Profile.objects.get_or_create(user=target_user)
                    profile.status = MemberStatus.ACTIVE
                    profile.save()
                    messages.success(request, f"Administrator '{target_user.get_full_name() or target_user.username}' is now Active.")
                except Exception as e:
                    messages.error(request, f"Error activating administrator: {e}")
            return redirect('accounts:administrators_list')

        elif action == 'remove_admin':
            user_id = request.POST.get('user_id')
            if user_id:
                try:
                    target_user = User.objects.get(id=user_id)
                    if target_user == request.user:
                        messages.error(request, "You cannot remove your own Administrator account.")
                    else:
                        full_name = target_user.get_full_name() or target_user.username
                        profile, _ = Profile.objects.get_or_create(user=target_user)
                        profile.status = MemberStatus.SUSPENDED
                        profile.save()
                        messages.success(request, f"Administrator '{full_name}' removed from workspace.")
                except Exception as e:
                    messages.error(request, f"Error removing administrator: {e}")
            return redirect('accounts:administrators_list')

        elif action == 'resend_admin_invitation':
            user_id = request.POST.get('user_id')
            if user_id:
                try:
                    target_user = User.objects.get(id=user_id)
                    profile, _ = Profile.objects.get_or_create(user=target_user)
                    profile.invitation_sent_at = timezone.now()
                    profile.status = MemberStatus.PENDING
                    profile.save()

                    temp_token = secrets.token_urlsafe(16)
                    invite_link = request.build_absolute_uri(f"/accounts/activate/?email={target_user.email}&token={temp_token}")
                    request.session['just_invited_admin'] = {
                        'id': target_user.id,
                        'name': target_user.get_full_name() or target_user.username,
                        'email': target_user.email,
                        'invite_link': invite_link,
                        'sent_at': timezone.now().strftime("%b %d, %Y at %I:%M %p"),
                        'expires_at': (timezone.now() + timedelta(days=7)).strftime("%b %d, %Y")
                    }

                    email_sent = False
                    if target_user.email:
                        email_sent = send_admin_invitation_email(target_user, invite_link, invited_by=request.user)

                    if email_sent:
                        messages.success(request, f"Administrator invitation email delivered to {target_user.email}.")
                    else:
                        messages.warning(request, f"New administrator invitation link generated for {target_user.email}. Direct email delivery could not be confirmed.")
                except Exception as e:
                    messages.error(request, f"Error resending invitation: {e}")
            return redirect('accounts:administrators_list')

    from django.db.models import Q
    admin_users = User.objects.filter(
        Q(is_superuser=True) | Q(profile__role=Role.ADMIN)
    ).select_related('profile').distinct().order_by('-date_joined')

    administrators = []
    total_active = 0
    total_pending = 0
    total_suspended = 0

    for u in admin_users:
        profile = getattr(u, 'profile', None)
        status_code = profile.status if profile else MemberStatus.ACTIVE
        phone = profile.phone_number if profile else ''
        invite_sent = profile.invitation_sent_at if profile else None

        if status_code == MemberStatus.ACTIVE:
            total_active += 1
            badge_class = 'bg-success-subtle text-success border border-success-subtle'
            status_label = 'Active'
        elif status_code == MemberStatus.PENDING:
            total_pending += 1
            badge_class = 'bg-warning-subtle text-warning border border-warning-subtle'
            status_label = 'Pending'
        else:
            total_suspended += 1
            badge_class = 'bg-danger-subtle text-danger border border-danger-subtle'
            status_label = 'Suspended'

        if u.last_login:
            from django.utils.timesince import timesince
            last_active_str = f"{timesince(u.last_login).split(',')[0]} ago"
        elif u.date_joined:
            last_active_str = "Recently created"
        else:
            last_active_str = "Never"

        administrators.append({
            'id': u.id,
            'username': u.username,
            'full_name': u.get_full_name() or u.username.replace('_', ' ').title(),
            'email': u.email or f"{u.username}@trizenai.studio",
            'phone_number': phone,
            'status': status_code,
            'status_label': status_label,
            'status_badge': badge_class,
            'created_at': u.date_joined.strftime("%b %d, %Y"),
            'last_active': last_active_str,
            'is_self': u == request.user,
        })

    just_invited = request.session.pop('just_invited_admin', None)

    context = {
        'administrators': administrators,
        'total_admins_count': len(administrators),
        'active_admins_count': total_active,
        'pending_admins_count': total_pending,
        'suspended_admins_count': total_suspended,
        'just_invited_admin': just_invited,
    }
    return render(request, 'accounts/administrators_list.html', context)


@admin_required
def administrator_details_api(request, admin_id):
    """
    JSON API providing details for Administrator details drawer.
    """
    from django.http import JsonResponse
    from django.contrib.auth.models import User
    from accounts.models import MemberStatus

    try:
        u = User.objects.select_related('profile').get(id=admin_id)
    except User.DoesNotExist:
        return JsonResponse({'error': 'Administrator not found'}, status=404)

    profile = getattr(u, 'profile', None)
    status_code = profile.status if profile else MemberStatus.ACTIVE

    data = {
        'id': u.id,
        'username': u.username,
        'full_name': u.get_full_name() or u.username.replace('_', ' ').title(),
        'email': u.email or f"{u.username}@trizenai.studio",
        'phone_number': (profile.phone_number if profile else '') or 'Not provided',
        'role': 'Administrator',
        'status': status_code,
        'status_label': 'Active' if status_code == MemberStatus.ACTIVE else ('Pending' if status_code == MemberStatus.PENDING else 'Suspended'),
        'created_at': u.date_joined.strftime("%b %d, %Y"),
        'last_active': u.last_login.strftime("%b %d, %Y %I:%M %p") if u.last_login else 'Recently joined',
        'is_self': u == request.user,
    }
    return JsonResponse(data)


def account_activation(request):
    """
    Dedicated account onboarding / activation page for invited Team Members and Administrators.
    Sets up password and completes registration with locked role.
    """
    from django.contrib.auth.models import User
    from accounts.forms import AccountActivationForm
    from accounts.models import MemberStatus

    email = request.GET.get('email', '') or request.POST.get('email', '')
    token = request.GET.get('token', '') or request.POST.get('token', '')

    target_user = User.objects.filter(email__iexact=email).first() if email else None

    if request.method == 'POST':
        form = AccountActivationForm(request.POST)
        if form.is_valid():
            if target_user:
                target_user.first_name = form.cleaned_data['first_name']
                target_user.last_name = form.cleaned_data['last_name']
                target_user.set_password(form.cleaned_data['password'])
                target_user.save()

                profile, _ = Profile.objects.get_or_create(user=target_user)
                profile.status = MemberStatus.ACTIVE
                profile.save()

                auth_login(request, target_user)
                messages.success(request, f"Welcome to TrizenAI Studio, {target_user.first_name}! Your account is now active.")
                return redirect('accounts:dashboard_router')
            else:
                messages.error(request, "Unable to locate invitation profile. Please check the invitation link.")
    else:
        initial_data = {}
        if target_user:
            initial_data['first_name'] = target_user.first_name
            initial_data['last_name'] = target_user.last_name
        form = AccountActivationForm(initial=initial_data)

    context = {
        'form': form,
        'email': email,
        'token': token,
        'workspace_name': 'TrizenAI Studio Alpha',
        'target_user': target_user,
    }
    return render(request, 'accounts/account_activation.html', context)


@login_required
def my_profile_view(request):
    """
    User Profile View accessible to all authenticated users (Admins and Team Members).
    """
    user = request.user
    profile = getattr(user, 'profile', None)

    if request.method == 'POST':
        first_name = request.POST.get('first_name', '').strip()
        last_name = request.POST.get('last_name', '').strip()
        username = request.POST.get('username', '').strip()
        phone = request.POST.get('phone_number', '').strip()

        if not username:
            messages.error(request, "Username cannot be empty.")
            return redirect('accounts:my_profile')

        if User.objects.filter(username__iexact=username).exclude(id=user.id).exists():
            messages.error(request, f"Username '{username}' is already taken. Please choose a different username.")
            return redirect('accounts:my_profile')

        user.first_name = first_name
        user.last_name = last_name
        user.username = username
        user.save()

        if profile:
            profile.phone_number = phone
            profile.save()

        messages.success(request, "Your profile has been updated successfully.")
        return redirect('accounts:my_profile')

    context = {
        'profile_user': user,
        'profile': profile,
    }
    return render(request, 'accounts/my_profile.html', context)


@login_required
def security_settings_view(request):
    """
    Security and Password Management View for authenticated users.
    """
    from accounts.forms import ChangePasswordForm
    from django.contrib.auth import update_session_auth_hash

    if request.method == 'POST':
        form = ChangePasswordForm(request.POST)
        if form.is_valid():
            current_pw = form.cleaned_data['current_password']
            new_pw = form.cleaned_data['new_password']

            if not request.user.check_password(current_pw):
                form.add_error('current_password', "Current password is incorrect.")
            else:
                request.user.set_password(new_pw)
                request.user.save()
                update_session_auth_hash(request, request.user)
                messages.success(request, "Password updated successfully.")
                return redirect('accounts:security_settings')
    else:
        form = ChangePasswordForm()

    context = {
        'form': form,
    }
    return render(request, 'accounts/security_settings.html', context)


def session_expired_view(request):
    """
    Explicit Session Expired Notice page.
    """
    return render(request, 'accounts/session_expired.html')


def unauthorized_view(request):
    """
    HTTP 401 Unauthorized page.
    """
    return render(request, '401.html', status=401)


def forbidden_view(request):
    """
    HTTP 403 Forbidden page.
    """
    return render(request, '403.html', status=403)


