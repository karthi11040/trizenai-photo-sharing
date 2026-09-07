import logging
from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from accounts.serializers import UserSerializer, LoginSerializer

logger = logging.getLogger(__name__)


class APILoginView(APIView):
    """
    POST /api/auth/login/
    Session authentication login endpoint.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "VALIDATION_ERROR",
                        "message": "Username and password are required.",
                        "fields": serializer.errors
                    }
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        username = serializer.validated_data['username']
        password = serializer.validated_data['password']
        user = authenticate(request, username=username, password=password)

        if user is None or not user.is_active:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "INVALID_CREDENTIALS",
                        "message": "Invalid username or password."
                    }
                },
                status=status.HTTP_401_UNAUTHORIZED
            )

        auth_login(request, user)
        logger.info("API login successful for user: %s", user.username)
        return Response(
            {
                "success": True,
                "data": {
                    "message": "Login successful.",
                    "user": UserSerializer(user).data
                }
            },
            status=status.HTTP_200_OK
        )


class APILogoutView(APIView):
    """
    POST /api/auth/logout/
    Terminates current user session.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        username = request.user.username
        auth_logout(request)
        logger.info("API logout successful for user: %s", username)
        return Response(
            {
                "success": True,
                "data": {
                    "message": "Logged out successfully."
                }
            },
            status=status.HTTP_200_OK
        )


class APIMeView(APIView):
    """
    GET /api/auth/me/
    Returns current authenticated user details and role.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(
            {
                "success": True,
                "data": serializer.data
            },
            status=status.HTTP_200_OK
        )
