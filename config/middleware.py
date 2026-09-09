import time
import secrets
import logging
from django.http import HttpResponse, JsonResponse
from django.core.cache import cache

logger = logging.getLogger(__name__)


class RequestIDMiddleware:
    """
    Attaches a unique correlation ID (req_...) to every incoming HTTP request and response header.
    Allows developers and DevOps to trace individual logs across views, DB queries, and external APIs.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request_id = request.headers.get('X-Request-ID') or f"req_{secrets.token_hex(8)}"
        request.request_id = request_id
        start_time = time.time()

        response = self.get_response(request)

        duration_ms = round((time.time() - start_time) * 1000, 2)
        response['X-Request-ID'] = request_id
        response['X-Response-Time'] = f"{duration_ms}ms"

        # Log request telemetry for production observability (excluding static assets)
        if not request.path.startswith('/static/'):
            logger.info("[%s] %s %s -> HTTP %s (%sms)", request_id, request.method, request.path, response.status_code, duration_ms)

        return response


class ProductionSecurityHeadersMiddleware:
    """
    Enforces robust production HTTP security headers across all responses.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['Referrer-Policy'] = 'same-origin'

        # Content-Security-Policy (Allow Bootstrap, Google Fonts, HTMX, static assets safely)
        if 'Content-Security-Policy' not in response:
            response['Content-Security-Policy'] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com; "
                "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; "
                "font-src 'self' https://cdn.jsdelivr.net https://fonts.gstatic.com; "
                "img-src 'self' data: blob: https:; "
                "connect-src 'self' https://*.supabase.co https://cdn.jsdelivr.net; "
                "frame-ancestors 'none';"
            )
        return response


class RateLimitMiddleware:
    """
    Simple in-memory / cache sliding window rate-limiter for sensitive endpoints.
    Protects against brute-force attacks on login, PIN verification, and password reset endpoints.
    """
    SENSITIVE_PATHS = {
        '/accounts/login/': (10, 60),          # 10 attempts per minute
        '/accounts/password-reset/': (5, 300),  # 5 attempts per 5 minutes
    }

    def __init__(self, get_response):
        self.get_response = get_response

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR', '127.0.0.1')

    def __call__(self, request):
        if request.method == 'POST' and request.path in self.SENSITIVE_PATHS:
            max_requests, window_seconds = self.SENSITIVE_PATHS[request.path]
            ip = self.get_client_ip(request)
            cache_key = f"ratelimit:{request.path}:{ip}"

            request_history = cache.get(cache_key, [])
            now = time.time()

            # Filter out timestamps outside window
            valid_history = [t for t in request_history if now - t < window_seconds]

            if len(valid_history) >= max_requests:
                logger.warning("Rate limit exceeded for IP %s on path %s", ip, request.path)
                if request.headers.get('HX-Request'):
                    return HttpResponse(
                        "<div class='alert alert-danger p-3 rounded-3 shadow-sm small'>"
                        "<i class='bi bi-exclamation-triangle-fill me-2'></i>"
                        "Too many requests. Please wait a moment before trying again."
                        "</div>",
                        status=429
                    )
                return JsonResponse({
                    'status': 'error',
                    'message': 'Too many attempts. Please try again later.'
                }, status=429)

            valid_history.append(now)
            cache.set(cache_key, valid_history, timeout=window_seconds)

        return self.get_response(request)
