import os
from io import BytesIO
from datetime import date
from unittest.mock import patch
from PIL import Image

from django.test import TestCase, Client
from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.exceptions import ValidationError, PermissionDenied
from django.contrib.auth.models import User

from events.models import Event
from events.services import EventService
from photos.models import Photo
from photos.services import PhotoService
from photos.storage import StorageService


def create_test_image(format='JPEG', size=(100, 100), color=(255, 0, 0)) -> bytes:
    """Generates valid image bytes in memory for testing."""
    buf = BytesIO()
    img = Image.new('RGB', size, color)
    img.save(buf, format=format)
    return buf.getvalue()


class PhotoSystemTests(TestCase):
    def setUp(self):
        self.client = Client()

        # Enable mock storage mode so tests execute offline without live Supabase dependency
        StorageService.enable_mock_mode(True)
        StorageService.clear_mock_storage()

        # Users
        self.admin = User.objects.create_superuser(
            username='admin_lead',
            email='lead@example.com',
            password='AdminPassword2026!'
        )
        self.member1 = User.objects.create_user(
            username='photographer_1',
            email='p1@example.com',
            password='Password2026!'
        )
        self.member2 = User.objects.create_user(
            username='photographer_2',
            email='p2@example.com',
            password='Password2026!'
        )

        # Events
        self.event1 = EventService.create_event(
            name='Summer Beach Wedding',
            event_date=date(2026, 9, 20),
            created_by=self.admin
        )
        # Assign member1 to event1, leave member2 unassigned
        EventService.add_team_member(self.event1, self.member1, acting_user=self.admin)

    def tearDown(self):
        StorageService.clear_mock_storage()

    def test_valid_photo_upload_creates_metadata_and_storage(self):
        """Valid JPEG image parses successfully, stores metadata in DB, and uploads to storage."""
        img_bytes = create_test_image(format='JPEG')
        uploaded = SimpleUploadedFile("wedding_cake.jpg", img_bytes, content_type="image/jpeg")

        photo = PhotoService.upload_photo(
            event=self.event1,
            user=self.member1,
            file_obj=uploaded,
            filename="wedding_cake.jpg"
        )

        self.assertIsNotNone(photo.id)
        self.assertEqual(photo.filename, "wedding_cake.jpg")
        self.assertEqual(photo.mime_type, "image/jpeg")
        self.assertEqual(photo.width, 100)
        self.assertEqual(photo.height, 100)
        self.assertTrue(photo.storage_path in StorageService._mock_storage)

    def test_invalid_file_extension_rejected(self):
        """Unsupported file extensions are rejected (Rule 28)."""
        uploaded = SimpleUploadedFile("malicious.sh", b"#!/bin/bash\necho hello", content_type="text/x-sh")
        with self.assertRaises(ValidationError) as ctx:
            PhotoService.upload_photo(self.event1, self.member1, uploaded, "malicious.sh")
        self.assertIn("Unsupported file extension", str(ctx.exception))

    def test_corrupt_image_bytes_rejected(self):
        """Fake images with .jpg extension but corrupt/text content are rejected by Pillow (Rule 28)."""
        fake_bytes = b"This is not a real JPEG image file content"
        uploaded = SimpleUploadedFile("fake_photo.jpg", fake_bytes, content_type="image/jpeg")
        with self.assertRaises(ValidationError) as ctx:
            PhotoService.upload_photo(self.event1, self.member1, uploaded, "fake_photo.jpg")
        self.assertIn("not a valid or readable image", str(ctx.exception))

    def test_large_file_upload_supported(self):
        """Large high-resolution images (>15MB) are supported and processed without size restriction."""
        img_bytes = create_test_image(format='JPEG', size=(500, 500))
        # Add padding to exceed 16MB
        padded_bytes = img_bytes + (b"\x00" * (16 * 1024 * 1024))
        uploaded = SimpleUploadedFile("high_res_raw.jpg", padded_bytes, content_type="image/jpeg")
        photo = PhotoService.upload_photo(self.event1, self.member1, uploaded, "high_res_raw.jpg")
        self.assertIsNotNone(photo.id)
        self.assertEqual(photo.filename, "high_res_raw.jpg")

    def test_empty_file_rejected(self):
        """0-byte empty files are rejected."""
        uploaded = SimpleUploadedFile("empty.jpg", b"", content_type="image/jpeg")
        with self.assertRaises(ValidationError) as ctx:
            PhotoService.upload_photo(self.event1, self.member1, uploaded, "empty.jpg")
        self.assertIn("empty", str(ctx.exception))

    def test_unassigned_member_cannot_upload(self):
        """Unassigned team member cannot upload photos to the event (Rule 31)."""
        img_bytes = create_test_image(format='PNG')
        uploaded = SimpleUploadedFile("unauth.png", img_bytes, content_type="image/png")
        with self.assertRaises(PermissionDenied):
            PhotoService.upload_photo(self.event1, self.member2, uploaded, "unauth.png")

    def test_storage_cleanup_on_database_failure(self):
        """If database insertion fails after storage upload, delete the uploaded object (Rule 29)."""
        img_bytes = create_test_image(format='JPEG')
        uploaded = SimpleUploadedFile("rollback.jpg", img_bytes, content_type="image/jpeg")

        with patch.object(Photo.objects, 'create', side_effect=RuntimeError("Simulated DB connection drop")):
            with self.assertRaises(ValidationError):
                PhotoService.upload_photo(self.event1, self.member1, uploaded, "rollback.jpg")

        # Verify storage was cleaned up so no orphaned object remains
        self.assertEqual(len(StorageService._mock_storage), 0)

    def test_failed_storage_upload_does_not_create_db_row(self):
        """If object storage upload fails, do not create database record (Rule 29)."""
        img_bytes = create_test_image(format='JPEG')
        uploaded = SimpleUploadedFile("storage_fail.jpg", img_bytes, content_type="image/jpeg")

        with patch.object(StorageService, 'upload', return_value=False):
            with self.assertRaises(ValidationError):
                PhotoService.upload_photo(self.event1, self.member1, uploaded, "storage_fail.jpg")

        self.assertFalse(Photo.objects.filter(filename="storage_fail.jpg").exists())

    def test_team_member_cannot_delete_other_user_photo(self):
        """Team member cannot delete another photographer's photo (Rule 31)."""
        img_bytes = create_test_image(format='JPEG')
        photo1 = PhotoService.upload_photo(
            self.event1, self.member1, SimpleUploadedFile("p1.jpg", img_bytes), "p1.jpg"
        )

        # photographer_2 attempts to delete photographer_1's photo
        with self.assertRaises(PermissionDenied):
            PhotoService.delete_photo(photo1, acting_user=self.member2)

        self.assertTrue(Photo.objects.filter(id=photo1.id).exists())

    def test_admin_can_delete_any_photo(self):
        """Admin can delete any photo belonging to their event."""
        img_bytes = create_test_image(format='JPEG')
        photo = PhotoService.upload_photo(
            self.event1, self.member1, SimpleUploadedFile("delete_me.jpg", img_bytes), "delete_me.jpg"
        )
        self.assertTrue(PhotoService.delete_photo(photo, acting_user=self.admin))
        self.assertFalse(Photo.objects.filter(id=photo.id).exists())

    def test_drf_photo_upload_and_visibility_api(self):
        """Verify DRF /api/events/{id}/photos/ and /upload/ endpoints."""
        img_bytes = create_test_image(format='JPEG')
        file_obj = SimpleUploadedFile("api_upload.jpg", img_bytes, content_type="image/jpeg")

        # 1. Team member 1 uploads photo via API
        self.client.login(username='photographer_1', password='Password2026!')
        upload_resp = self.client.post(
            reverse('api_events:api_event_photos_upload', kwargs={'id': self.event1.id}),
            {'photos': [file_obj]}
        )
        self.assertEqual(upload_resp.status_code, 201)
        resp_data = upload_resp.json()
        self.assertTrue(resp_data['success'])
        self.assertEqual(len(resp_data['data']['uploaded']), 1)
        photo_id = resp_data['data']['uploaded'][0]['id']

        # 2. Team member 1 retrieves photos for event -> sees 1 photo
        list_resp = self.client.get(reverse('api_events:api_event_photos', kwargs={'id': self.event1.id}))
        self.assertEqual(list_resp.status_code, 200)
        self.assertEqual(len(list_resp.json()['data']), 1)

        # 3. Unassigned team member 2 tries to access photos -> 403
        self.client.login(username='photographer_2', password='Password2026!')
        unauth_resp = self.client.get(reverse('api_events:api_event_photos', kwargs={'id': self.event1.id}))
        self.assertEqual(unauth_resp.status_code, 403)

        # 4. Admin accesses photos -> 200 OK
        self.client.login(username='admin_lead', password='AdminPassword2026!')
        admin_resp = self.client.get(reverse('api_events:api_event_photos', kwargs={'id': self.event1.id}))
        self.assertEqual(admin_resp.status_code, 200)
        self.assertEqual(len(admin_resp.json()['data']), 1)
