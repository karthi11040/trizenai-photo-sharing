import logging
import urllib.parse
from typing import Optional
import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class StorageService:
    """
    Storage Service Abstraction for Supabase Object Storage (Rule 27).
    Encapsulates all Supabase Storage HTTP interactions behind a unified interface.
    Supports mock/fallback mode for offline development and automated testing (Rule 46).
    """

    # In-memory storage dictionary used during testing or offline mock mode
    _mock_storage: dict[str, bytes] = {}
    _mock_mode: bool = False

    @classmethod
    def enable_mock_mode(cls, enabled: bool = True):
        cls._mock_mode = enabled

    @classmethod
    def clear_mock_storage(cls):
        cls._mock_storage.clear()

    @classmethod
    def is_live_configured(cls) -> bool:
        return bool(
            not cls._mock_mode and
            getattr(settings, 'SUPABASE_URL', '') and
            getattr(settings, 'SUPABASE_SERVICE_ROLE_KEY', '')
        )

    @classmethod
    def get_bucket_name(cls) -> str:
        return getattr(settings, 'SUPABASE_STORAGE_BUCKET', 'event-photos')

    @classmethod
    def upload(cls, storage_path: str, content: bytes, content_type: str = 'image/jpeg') -> bool:
        """
        Uploads a binary object to Supabase Storage.
        Returns True if successful, False otherwise.
        """
        bucket = cls.get_bucket_name()

        if not cls.is_live_configured():
            cls._mock_storage[storage_path] = content
            logger.debug("[MockStorage] Uploaded %s (%d bytes)", storage_path, len(content))
            return True

        supabase_url = settings.SUPABASE_URL.rstrip('/')
        service_key = settings.SUPABASE_SERVICE_ROLE_KEY
        endpoint = f"{supabase_url}/storage/v1/object/{bucket}/{storage_path}"

        headers = {
            "Authorization": f"Bearer {service_key}",
            "apikey": service_key,
            "Content-Type": content_type,
            "x-upsert": "true",
        }

        try:
            response = requests.post(endpoint, data=content, headers=headers, timeout=15)
            if response.status_code in (200, 201):
                logger.info("Successfully uploaded object to Supabase: %s", storage_path)
                return True
            else:
                logger.error("Supabase Storage upload failed [%d]: %s", response.status_code, response.text)
                return False
        except Exception as e:
            logger.exception("Supabase Storage upload request failed: %s", e)
            return False

    @classmethod
    def delete(cls, storage_path: str) -> bool:
        """
        Deletes an object from Supabase Storage.
        Used during photo removal and DB rollback cleanup (Rule 29).
        """
        bucket = cls.get_bucket_name()

        if not cls.is_live_configured():
            cls._mock_storage.pop(storage_path, None)
            logger.debug("[MockStorage] Deleted %s", storage_path)
            return True

        supabase_url = settings.SUPABASE_URL.rstrip('/')
        service_key = settings.SUPABASE_SERVICE_ROLE_KEY
        endpoint = f"{supabase_url}/storage/v1/object/{bucket}/{storage_path}"

        headers = {
            "Authorization": f"Bearer {service_key}",
            "apikey": service_key,
        }

        try:
            response = requests.delete(endpoint, headers=headers, timeout=10)
            if response.status_code in (200, 204):
                logger.info("Successfully deleted object from Supabase: %s", storage_path)
                return True
            else:
                logger.warning("Supabase Storage delete returned [%d]: %s", response.status_code, response.text)
                return False
        except Exception as e:
            logger.exception("Supabase Storage delete request failed: %s", e)
            return False

    @classmethod
    def create_signed_url(cls, storage_path: str, expires_in: int = 3600) -> str:
        """
        Generates a time-limited signed URL for private bucket photo access (Rule 35).
        """
        bucket = cls.get_bucket_name()

        if not cls.is_live_configured():
            # In mock mode, return an authenticated proxy path
            return f"/photos/mock-stream/{storage_path}?expires={expires_in}"

        supabase_url = settings.SUPABASE_URL.rstrip('/')
        service_key = settings.SUPABASE_SERVICE_ROLE_KEY
        endpoint = f"{supabase_url}/storage/v1/object/sign/{bucket}/{storage_path}"

        headers = {
            "Authorization": f"Bearer {service_key}",
            "apikey": service_key,
            "Content-Type": "application/json",
        }
        payload = {"expiresIn": expires_in}

        try:
            response = requests.post(endpoint, json=payload, headers=headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                signed_subpath = data.get("signedURL", "")
                if signed_subpath:
                    # Supabase returns relative signed URL e.g. /storage/v1/object/sign/...
                    if signed_subpath.startswith("http"):
                        return signed_subpath
                    return f"{supabase_url}/storage/v1{signed_subpath}"
            logger.error("Supabase Storage signed URL failed [%d]: %s", response.status_code, response.text)
        except Exception as e:
            logger.exception("Supabase Storage signed URL request error: %s", e)

        # Fallback to direct path or placeholder
        return f"{supabase_url}/storage/v1/object/{bucket}/{storage_path}"
