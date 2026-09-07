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
