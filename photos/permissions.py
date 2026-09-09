from rest_framework.permissions import BasePermission, SAFE_METHODS
from photos.models import Photo


class IsPhotoOwnerOrAdmin(BasePermission):
    """
    Allows access:
    - Admins can perform any action on photos.
    - Photographers can read or delete only their own uploaded photos.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj: Photo):
        is_admin = request.user.is_superuser or (
            hasattr(request.user, 'profile') and request.user.profile.is_admin
        )
        if is_admin:
            return True

        if obj.uploaded_by_id == request.user.id:
            return True

        return False
