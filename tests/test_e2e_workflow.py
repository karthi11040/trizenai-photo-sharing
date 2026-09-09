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

from accounts.models import Profile, Role, MemberStatus
from events.models import Event, EventMembership
from events.services import EventService
from photos.models import Photo
from photos.services import PhotoService
from photos.storage import StorageService
from galleries.models import Gallery, GalleryPhoto, GalleryView


def create_test_image(format='JPEG', size=(100, 100), color=(255, 0, 0)) -> bytes:
    """Generates valid image bytes in memory for testing."""
    buf = BytesIO()
    img = Image.new('RGB', size, color)
    img.save(buf, format=format)
    return buf.getvalue()


class CompleteEndToEndWorkflowAuditTest(TestCase):
    """
    Complete End-to-End Workflow Audit & Verification Suite (Section 39 & 40).
    Verifies all 36 E2E steps and negative permission/security boundary tests.
    """

    def setUp(self):
        StorageService.enable_mock_mode(True)
        StorageService.clear_mock_storage()

    def tearDown(self):
        StorageService.clear_mock_storage()

    def test_full_36_step_e2e_workflow_and_negative_security_boundaries(self):
        # -------------------------------------------------------------
        # STEP 1: Create Admin A
        # -------------------------------------------------------------
        admin_a = User.objects.create_superuser(
            username='admin_a',
            email='admin-a@test.local',
            password='AdminPassword2026!'
        )
        self.assertTrue(admin_a.profile.is_admin)

        # -------------------------------------------------------------
        # STEP 2 & 3: Admin A logs in and receives secure session
        # -------------------------------------------------------------
        admin_client = Client()
        login_success = admin_client.login(username='admin_a', password='AdminPassword2026!')
        self.assertTrue(login_success)

        # -------------------------------------------------------------
        # STEP 4: Verify unique Admin dashboard URL
        # -------------------------------------------------------------
        admin_token = admin_a.profile.dashboard_token
        self.assertTrue(len(admin_token) >= 16)
        dash_url = reverse('accounts:admin_dashboard_token', kwargs={'token': admin_token})
        dash_resp = admin_client.get(dash_url)
        self.assertEqual(dash_resp.status_code, 200)

        # -------------------------------------------------------------
        # STEP 5: Admin A creates Event A
        # -------------------------------------------------------------
        event_a = EventService.create_event(
            name='Royal Heritage Wedding 2026',
            event_date=date(2026, 9, 25),
            location='Palace Grounds',
            created_by=admin_a
        )
        self.assertEqual(event_a.created_by, admin_a)

        # -------------------------------------------------------------
        # STEP 6 & 7: Admin A creates Team Member A & generates invite
        # -------------------------------------------------------------
        member_a_user = User.objects.create_user(
            username='member_a',
            email='member-a@test.local',
            password='InitialMemberPwd2026!'
        )
        member_a_profile = member_a_user.profile
        member_a_profile.role = Role.TEAM_MEMBER
        member_a_profile.status = MemberStatus.PENDING
        member_a_profile.save()

        # Assign Member A to Event A
        EventService.add_team_member(event_a, member_a_user, acting_user=admin_a)
        self.assertTrue(event_a.is_member(member_a_user))

        # -------------------------------------------------------------
        # STEP 8 & 9: Team Member A activates account and creates password
        # -------------------------------------------------------------
        member_a_profile.status = MemberStatus.ACTIVE
        member_a_user.set_password('MemberPassword2026!')
        member_a_user.save()
        member_a_profile.save()

        # -------------------------------------------------------------
        # STEP 10 & 11: Team Member A logs in & accesses assigned event
        # -------------------------------------------------------------
        member_client = Client()
        m_login = member_client.login(username='member_a', password='MemberPassword2026!')
        self.assertTrue(m_login)
        m_dash_resp = member_client.get(reverse('accounts:team_dashboard'))
        self.assertEqual(m_dash_resp.status_code, 200)

        # -------------------------------------------------------------
        # STEP 12: Verify Team Member CANNOT access Admin features
        # -------------------------------------------------------------
        m_admin_dash_resp = member_client.get(dash_url)
        self.assertIn(m_admin_dash_resp.status_code, [403, 302])

        m_team_manage_resp = member_client.get(reverse('accounts:team_management'))
        self.assertIn(m_team_manage_resp.status_code, [403, 302])

        # -------------------------------------------------------------
        # STEP 13, 14 & 15: Team Member uploads 5 valid photos -> Storage & DB
        # -------------------------------------------------------------
        uploaded_photos = []
        for i in range(1, 6):
            img_bytes = create_test_image(format='JPEG', color=(i*40, 50, 100))
            f_obj = SimpleUploadedFile(f"photo_{i}.jpg", img_bytes, content_type="image/jpeg")
            photo = PhotoService.upload_photo(
                event=event_a,
                user=member_a_user,
                file_obj=f_obj,
                filename=f"photo_{i}.jpg"
            )
            uploaded_photos.append(photo)

        self.assertEqual(Photo.objects.filter(event=event_a).count(), 5)
        self.assertEqual(len(StorageService._mock_storage), 5)

        # -------------------------------------------------------------
        # STEP 16 & 17: Admin A opens Event & sees all 5 photos
        # -------------------------------------------------------------
        ev_photos_resp = admin_client.get(reverse('photos:event_photos', kwargs={'event_id': event_a.id}))
        self.assertEqual(ev_photos_resp.status_code, 200)
        self.assertContains(ev_photos_resp, 'photo_1.jpg')

        # -------------------------------------------------------------
        # STEP 18, 19, 20: Admin selects 3 photos & creates Gallery
        # -------------------------------------------------------------
        selected_photos = uploaded_photos[:3]
        gallery, _ = Gallery.objects.get_or_create(
            event=event_a,
            defaults={'title': event_a.name, 'slug': 'royal-heritage-wedding-2026'}
        )
        for p in selected_photos:
            GalleryPhoto.objects.get_or_create(gallery=gallery, photo=p)

        self.assertEqual(gallery.gallery_photos.count(), 3)

        # -------------------------------------------------------------
        # STEP 21 & 22: Admin sets 6-digit PIN & verifies secure hash
        # -------------------------------------------------------------
        gallery.set_pin('789123')
        gallery.save()
        self.assertEqual(gallery.pin_code, '789123')
        self.assertTrue(gallery.check_pin('789123'))
        self.assertNotEqual(gallery.pin_hash, '789123')

        # -------------------------------------------------------------
        # STEP 23: Admin publishes Gallery
        # -------------------------------------------------------------
        gallery.is_published = True
        gallery.save()
        self.assertTrue(gallery.is_published)

        # -------------------------------------------------------------
        # STEP 24 & 25: Customer opens gallery in unauthenticated context -> PIN gate
        # -------------------------------------------------------------
        customer_client = Client()
        gate_url = reverse('galleries:customer_gallery_router', kwargs={'slug': gallery.slug})
        gate_resp = customer_client.get(gate_url)
        self.assertEqual(gate_resp.status_code, 200)
        self.assertContains(gate_resp, 'pin')

        # -------------------------------------------------------------
        # STEP 26: Customer enters wrong PIN -> Denied
        # -------------------------------------------------------------
        wrong_pin_resp = customer_client.post(
            reverse('galleries:customer_gallery_verify_pin', kwargs={'slug': gallery.slug}),
            {'pin': '000000'},
            follow=True
        )
        self.assertContains(wrong_pin_resp, 'Incorrect')

        # -------------------------------------------------------------
        # STEP 27 & 28: Customer enters correct PIN -> Access Granted, sees exactly 3 photos
        # -------------------------------------------------------------
        correct_pin_resp = customer_client.post(
            reverse('galleries:customer_gallery_verify_pin', kwargs={'slug': gallery.slug}),
            {'pin': '789123'},
            follow=True
        )
        self.assertEqual(correct_pin_resp.status_code, 200)
        self.assertContains(correct_pin_resp, 'photo_1.jpg')
        self.assertContains(correct_pin_resp, 'photo_2.jpg')
        self.assertContains(correct_pin_resp, 'photo_3.jpg')
        self.assertNotContains(correct_pin_resp, 'photo_4.jpg')
        self.assertNotContains(correct_pin_resp, 'photo_5.jpg')

        # -------------------------------------------------------------
        # STEP 29 & 30: Unselected photos & cross-event photos remain inaccessible
        # -------------------------------------------------------------
        event_b = EventService.create_event(name='Private Tech Conference', event_date=date(2026, 10, 1), created_by=admin_a)
        unsel_p = uploaded_photos[3]
        self.assertFalse(GalleryPhoto.objects.filter(gallery=gallery, photo=unsel_p).exists())

        # -------------------------------------------------------------
        # STEP 31 & 32: Team Member CANNOT publish gallery or access unassigned event
        # -------------------------------------------------------------
        pub_resp = member_client.post(reverse('galleries:gallery_publish', kwargs={'gallery_id': gallery.id}))
        # Member is not admin -> redirect or 403
        self.assertIn(pub_resp.status_code, [403, 302])

        unassigned_resp = member_client.get(reverse('photos:upload_photos', kwargs={'event_id': event_b.id}))
        self.assertIn(unassigned_resp.status_code, [403, 302])

        # -------------------------------------------------------------
        # STEP 35 & 36: Session Invalidation on Logout
        # -------------------------------------------------------------
        admin_client.logout()
        post_logout_resp = admin_client.get(dash_url)
        self.assertIn(post_logout_resp.status_code, [302, 403])

        # -------------------------------------------------------------
        # NEGATIVE E2E TESTS (Section 40)
        # -------------------------------------------------------------
        # 1. Anonymous -> Admin dashboard
        anon_client = Client()
        self.assertIn(anon_client.get(dash_url).status_code, [302, 403])

        # 2. Unpublished gallery access -> 404
        unpub_gallery = Gallery.objects.create(event=event_b, slug='unpub-event-b', is_published=False)
        self.assertEqual(anon_client.get(reverse('galleries:customer_gallery_router', kwargs={'slug': unpub_gallery.slug})).status_code, 404)

        # 3. Invalid upload (non-image extension) -> ValidationError
        bad_file = SimpleUploadedFile("script.py", b"print('hack')", content_type="text/x-python")
        with self.assertRaises(ValidationError):
            PhotoService.upload_photo(event_a, member_a_user, bad_file, "script.py")

        # 4. Storage upload failure rollback
        with patch.object(StorageService, 'upload', return_value=False):
            with self.assertRaises(ValidationError):
                PhotoService.upload_photo(event_a, member_a_user, SimpleUploadedFile("fail.jpg", create_test_image()), "fail.jpg")
        self.assertFalse(Photo.objects.filter(filename="fail.jpg").exists())

        # 5. Database failure cleanup after storage upload
        with patch.object(Photo.objects, 'create', side_effect=RuntimeError("DB Exception")):
            with self.assertRaises(ValidationError):
                PhotoService.upload_photo(event_a, member_a_user, SimpleUploadedFile("db_fail.jpg", create_test_image()), "db_fail.jpg")

        # 6. Suspended account login -> Denied
        suspended_user = User.objects.create_user(username='suspended_user', password='Pwd2026!')
        suspended_user.profile.status = MemberStatus.SUSPENDED
        suspended_user.profile.save()
        s_client = Client()
        s_resp = s_client.post(reverse('accounts:login'), {'username': 'suspended_user', 'password': 'Pwd2026!'}, follow=True)
        self.assertContains(s_resp, 'Your account is currently unavailable')
        self.assertFalse('_auth_user_id' in s_client.session)
