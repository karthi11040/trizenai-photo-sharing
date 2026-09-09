import logging
from django.http import JsonResponse, HttpResponse
from django.db import connection
from django.shortcuts import render, redirect

logger = logging.getLogger(__name__)


def health_check(request):
    """
    Health check endpoint for deployment monitoring and uptime verification.
    Verifies application response and database connectivity.
    """
    db_status = "ok"
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
    except Exception as e:
        logger.error("Health check DB connection failed: %s", e)
        db_status = "error"
        return JsonResponse(
            {"status": "error", "database": db_status},
            status=503
        )

    return JsonResponse(
        {"status": "ok", "database": db_status},
        status=200
    )


def home(request):
    """
    Landing page redirecting authenticated users to their dashboard,
    or rendering the public platform home.
    """
    if request.user.is_authenticated:
        return redirect('accounts:dashboard_router')
    return render(request, 'home.html')


def custom_bad_request(request, exception=None):
    """Production 400 Bad Request view."""
    return render(request, '400.html', status=400)


def custom_permission_denied(request, exception=None):
    """Production 403 Permission Denied view."""
    return render(request, '403.html', status=403)


def custom_page_not_found(request, exception=None):
    """Production 404 Page Not Found view."""
    return render(request, '404.html', status=404)


def custom_server_error(request):
    """Production 500 Server Error view."""
    return render(request, '500.html', status=500)

