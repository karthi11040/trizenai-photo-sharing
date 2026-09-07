import logging
from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from accounts.forms import RegisterForm, LoginForm
from accounts.permissions import admin_required, team_member_required

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
    """
    if request.user.is_authenticated:
        return redirect('accounts:dashboard_router')

    next_url = request.GET.get('next', '')

    if request.method == 'POST':
        form = LoginForm(request.POST)
        if form.is_valid():
            username = form.cleaned_data['username']
            password = form.cleaned_data['password']
            user = authenticate(request, username=username, password=password)

            if user is not None and user.is_active:
                auth_login(request, user)
                messages.success(request, f"Welcome back, {user.username}!")
                logger.info("User logged in: %s (role: %s)", user.username, getattr(user.profile, 'role', 'NONE'))
                if next_url and next_url.startswith('/'):
                    return redirect(next_url)
                return redirect('accounts:dashboard_router')
            else:
                messages.error(request, "Invalid username or password.")
                logger.warning("Failed login attempt for username: %s", username)
    else:
        form = LoginForm()

    return render(request, 'accounts/login.html', {'form': form, 'next': next_url})


def logout_view(request):
    """
    Terminates user session and redirects to home page.
    """
    if request.user.is_authenticated:
        username = request.user.username
        auth_logout(request)
        logger.info("User logged out: %s", username)
        messages.info(request, "You have been logged out successfully.")
    return redirect('home')


@login_required
def dashboard_router(request):
    """
    Central router directing users to the appropriate role-based dashboard.
    """
    if request.user.is_superuser or (hasattr(request.user, 'profile') and request.user.profile.is_admin):
        return redirect('accounts:admin_dashboard')
    return redirect('accounts:team_dashboard')


@admin_required
def admin_dashboard(request):
    """
    Dedicated dashboard for Photography Leads / Administrators.
    """
    return render(request, 'accounts/admin_dashboard.html')


@team_member_required
def team_dashboard(request):
    """
    Dedicated dashboard for Team Photographers.
    """
    return render(request, 'accounts/team_dashboard.html')
