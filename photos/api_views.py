import logging
from django.shortcuts import get_object_or_404
from django.core.exceptions import ValidationError, PermissionDenied
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser

from events.models import Event
from events.services import EventService
from photos.models import Photo
from photos.services import PhotoService
from photos.serializers import PhotoSerializer
from photos.permissions import IsPhotoOwnerOrAdmin

logger = logging.getLogger(__name__)


class EventPhotoListUploadAPIView(APIView):
    """
    GET  /api/events/{id}/photos/          - List visible event photos
    POST /api/events/{id}/photos/upload/   - Upload multiple photos
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request, id):
        event = get_object_or_404(Event, id=id)
        if not EventService.can_user_access_event(request.user, event):
            return Response({
                "success": False,
                "error": {
                    "code": "FORBIDDEN",
                    "message": "You are not authorized to view photos for this event."
                }
            }, status=status.HTTP_403_FORBIDDEN)

        photos = PhotoService.get_visible_photos_for_event(request.user, event)
        serializer = PhotoSerializer(photos, many=True)
        return Response({
            "success": True,
            "data": serializer.data
        }, status=status.HTTP_200_OK)

    def post(self, request, id):
        event = get_object_or_404(Event, id=id)
        if not EventService.can_user_access_event(request.user, event):
            return Response({
                "success": False,
                "error": {
                    "code": "FORBIDDEN",
                    "message": "You are not authorized to upload photos to this event."
                }
            }, status=status.HTTP_403_FORBIDDEN)

        files = request.FILES.getlist('photos')
        if not files:
            # Support single photo upload with 'photo' or 'file' key
            single_file = request.FILES.get('photo') or request.FILES.get('file')
            if single_file:
                files = [single_file]

        if not files:
            return Response({
                "success": False,
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "No photo files provided. Send multipart/form-data with 'photos' field."
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        uploaded_photos = []
        errors = []

        for f in files:
            try:
                photo = PhotoService.upload_photo(
                    event=event,
                    user=request.user,
                    file_obj=f,
                    filename=f.name
                )
                uploaded_photos.append(photo)
            except (ValidationError, PermissionDenied) as e:
                errors.append({"filename": f.name, "error": str(e.message if hasattr(e, 'message') else e)})
            except Exception as e:
                logger.exception("API upload failed for %s: %s", f.name, e)
                errors.append({"filename": f.name, "error": "Internal upload failure."})

        if not uploaded_photos and errors:
            return Response({
                "success": False,
                "error": {
                    "code": "UPLOAD_FAILED",
                    "message": "All photo uploads failed.",
                    "details": errors
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        serializer = PhotoSerializer(uploaded_photos, many=True)
        return Response({
            "success": True,
            "data": {
                "uploaded": serializer.data,
                "errors": errors
            }
        }, status=status.HTTP_201_CREATED)


class PhotoDetailAPIView(APIView):
    """
    GET    /api/photos/{id}/  - Retrieve photo metadata & signed URL
    DELETE /api/photos/{id}/  - Delete photo (Admin or Owner only)
    """
    permission_classes = [IsAuthenticated, IsPhotoOwnerOrAdmin]

    def get_object(self, id):
        photo = get_object_or_404(Photo, id=id)
        self.check_object_permissions(self.request, photo)
        return photo

    def get(self, request, id):
        photo = self.get_object(id)
        return Response({
            "success": True,
            "data": PhotoSerializer(photo).data
        }, status=status.HTTP_200_OK)

    def delete(self, request, id):
        photo = self.get_object(id)
        PhotoService.delete_photo(photo, acting_user=request.user)
        return Response({
            "success": True,
            "data": {"message": f"Photo '{photo.filename}' deleted successfully."}
        }, status=status.HTTP_200_OK)
