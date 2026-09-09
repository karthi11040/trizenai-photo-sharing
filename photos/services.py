import os
import uuid
import logging
from io import BytesIO
from typing import Tuple, List
from PIL import Image

from django.db import transaction
from django.core.exceptions import ValidationError, PermissionDenied
from django.contrib.auth.models import User
from django.db.models import QuerySet

from events.models import Event
from events.services import EventService
from photos.models import Photo
from photos.storage import StorageService

logger = logging.getLogger(__name__)

# Allow ultra-high-resolution, gigapixel, and RAW photography without DecompressionBomb limits
Image.MAX_IMAGE_PIXELS = None

# Allowed extensions and MIME types (Unrestricted photography support)
ALLOWED_EXTENSIONS = {
    '.jpg', '.jpeg', '.png', '.webp', '.tiff', '.tif',
    '.heic', '.heif', '.bmp', '.gif', '.raw', '.cr2',
    '.cr3', '.nef', '.arw', '.dng', '.svg'
}
ALLOWED_MIME_TYPES = {
    'image/jpeg', 'image/png', 'image/webp', 'image/tiff',
    'image/heic', 'image/heif', 'image/bmp', 'image/gif',
    'image/x-adobe-dng', 'image/x-canon-cr2', 'image/x-nikon-nef',
    'image/x-sony-arw', 'image/svg+xml'
}
FORMAT_TO_MIME = {
    'JPEG': 'image/jpeg',
    'PNG': 'image/png',
    'WEBP': 'image/webp',
    'TIFF': 'image/tiff',
    'BMP': 'image/bmp',
    'GIF': 'image/gif',
    'HEIF': 'image/heif',
    'HEIC': 'image/heic',
    'DNG': 'image/x-adobe-dng',
}


class PhotoService:
    @staticmethod
    def validate_and_parse_image(file_obj, filename: str) -> Tuple[bytes, str, int, int]:
        """
        Validates the uploaded file with support for N file sizes and high-resolution images:
        1. Non-empty file verification
        2. Format & extension inspection
        3. Pillow image dimension parsing (unrestricted file size and pixel resolution)
        Returns: (file_bytes, mime_type, width, height)
        """
        # Read content bytes
        if hasattr(file_obj, 'read'):
            content = file_obj.read()
        else:
            content = bytes(file_obj)

        file_size = len(content)
        if file_size == 0:
            raise ValidationError("The uploaded file is empty.")

        # 1. Extension check
        _, ext = os.path.splitext(filename.lower())
        if ext and ext not in ALLOWED_EXTENSIONS:
            raise ValidationError(
                f"Unsupported file extension '{ext}'. Allowed extensions: {', '.join(sorted(ALLOWED_EXTENSIONS))}."
            )

        # 2. Pillow validation and dimension extraction
        width, height = 0, 0
        img_format = None
        try:
            image_buffer = BytesIO(content)
            with Image.open(image_buffer) as img:
                img_format = img.format
                width, height = img.size
        except Exception as e:
            # Fallback for specialized RAW / non-Pillow raster formats
            if ext in {'.raw', '.cr2', '.cr3', '.nef', '.arw', '.dng', '.svg'}:
                width, height = 4000, 3000
                img_format = 'DNG' if ext == '.dng' else 'JPEG'
            else:
                logger.warning("Corrupt or invalid image uploaded [%s]: %s", filename, e)
                raise ValidationError(f"File '{filename}' is not a valid or readable image.")

        mime_type = FORMAT_TO_MIME.get(img_format, 'image/jpeg')
        return content, mime_type, width, height

    @classmethod
    def upload_photo(
        cls,
        event: Event,
        user: User,
        file_obj,
        filename: str
    ) -> Photo:
        """
        Uploads and registers a single photo (Rules 28, 29, 31).
        Enforces failure rollback: If DB insertion fails, deletes from storage.
        """
        # Authorization check: User must be Admin or assigned Team Member
        if not EventService.can_user_access_event(user, event):
            raise PermissionDenied("You are not authorized to upload photos to this event.")

        # Validate image content and dimensions
        content, mime_type, width, height = cls.validate_and_parse_image(file_obj, filename)

        # Generate human-readable, valid storage path for Supabase Storage
        from django.utils.text import slugify
        base_name, ext = os.path.splitext(filename)
        clean_file_slug = slugify(base_name) or "photo"
        unique_suffix = uuid.uuid4().hex[:8]
        clean_filename = f"{clean_file_slug}_{unique_suffix}{ext.lower()}"
        folder_name = getattr(event, 'storage_folder_name', f"event_{event.id}")
        storage_path = f"events/{folder_name}/{clean_filename}"

        # Step 3: Upload to Supabase Storage
        upload_success = StorageService.upload(
            storage_path=storage_path,
            content=content,
            content_type=mime_type
        )
        if not upload_success:
            logger.error("Storage upload failed for %s to %s", filename, storage_path)
            raise ValidationError(f"Failed to store photo '{filename}' in object storage.")

        # Step 4: Create PostgreSQL Photo record
        try:
            photo = Photo.objects.create(
                event=event,
                uploaded_by=user,
                filename=filename,
                storage_path=storage_path,
                file_size=len(content),
                mime_type=mime_type,
                width=width,
                height=height
            )
            logger.info("Created photo record ID %d: %s", photo.id, storage_path)
            return photo
        except Exception as db_err:
            # Step 5: Rollback external Storage upload on DB failure (Rule 29)
            logger.exception("Database error while creating photo record. Rolling back storage object: %s", storage_path)
            StorageService.delete(storage_path)
            raise ValidationError(f"Failed to save photo metadata: {db_err}")

    @classmethod
    def get_visible_photos_for_event(cls, user: User, event: Event) -> QuerySet[Photo]:
        """
        Object-level photo visibility (Rule 31):
        - Admin: Can view all photos uploaded for the authorized event.
        - Team Member: Can view only their own uploaded photos for the event.
        """
        if not EventService.can_user_access_event(user, event):
            return Photo.objects.none()

        if user.is_superuser or (hasattr(user, 'profile') and user.profile.is_admin):
            return Photo.objects.filter(event=event).select_related('uploaded_by')

        # Team member: Scoped strictly to own uploads
        return Photo.objects.filter(event=event, uploaded_by=user).select_related('uploaded_by')

    @classmethod
    def delete_photo(cls, photo: Photo, acting_user: User) -> bool:
        """
        Deletes a photo and its object storage binary.
        Only Admins or the original uploader can delete (Rule 31).
        """
        is_admin = acting_user.is_superuser or (hasattr(acting_user, 'profile') and acting_user.profile.is_admin)
        is_owner = photo.uploaded_by_id == acting_user.id

        if not (is_admin or is_owner):
            raise PermissionDenied("You do not have permission to delete this photo.")

        storage_path = photo.storage_path
        photo_id = photo.id

        # Delete database record
        photo.delete()

        # Delete from object storage
        StorageService.delete(storage_path)
        logger.info("Deleted photo ID %d and storage path %s by %s", photo_id, storage_path, acting_user.username)
        return True
