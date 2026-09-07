import logging
from rest_framework.views import exception_handler
from rest_framework.exceptions import APIException, ValidationError, NotAuthenticated, PermissionDenied
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Standardized API Error Handler conforming to TrizenAI API Error Contract:
    {
        "success": False,
        "error": {
            "code": "ERROR_CODE",
            "message": "Human readable message",
            "fields": {...}  # optional, for validation errors
        }
    }
    """
    # Call REST framework's default exception handler first to get the standard error response
    response = exception_handler(exc, context)

    if response is not None:
        error_code = "API_ERROR"
        fields = None

        if isinstance(exc, ValidationError):
            error_code = "VALIDATION_ERROR"
            message = "Invalid request."
            if isinstance(response.data, dict):
                fields = response.data
            elif isinstance(response.data, list):
                fields = {"detail": response.data}
        elif isinstance(exc, NotAuthenticated):
            error_code = "UNAUTHORIZED"
            message = "Authentication credentials were not provided."
        elif isinstance(exc, PermissionDenied):
            error_code = "FORBIDDEN"
            message = "You do not have permission to perform this action."
        else:
            message = response.data.get("detail", "An error occurred.") if isinstance(response.data, dict) else str(response.data)

        formatted_data = {
            "success": False,
            "error": {
                "code": error_code,
                "message": message,
            }
        }
        if fields:
            formatted_data["error"]["fields"] = fields

        response.data = formatted_data
        return response

    # Handle unhandled exceptions without leaking internal stack traces in production
    logger.exception("Unhandled API exception occurred: %s", exc)
    return Response(
        {
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected server error occurred."
            }
        },
        status=status.HTTP_500_INTERNAL_SERVER_ERROR
    )
