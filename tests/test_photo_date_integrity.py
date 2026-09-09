from datetime import date, datetime, timedelta
from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from events.models import Event
from photos.models import Photo
from galleries.models import Gallery, GalleryPhoto


from unittest.mock import patch

class PhotoDateIntegrityTestCase(TestCase):
    def setUp(self):
        self.storage_patcher = patch('photos.storage.StorageService.create_signed_url', return_value='http://test.com/signed.jpg')
        self.mock_create_signed_url = self.storage_patcher.start()

        self.admin = User.objects.create_superuser('admin_user', 'admin@example.com', 'password123')
        self.team_member = User.objects.create_user('photographer_alex', 'alex@example.com', 'password123')
        
        # Create event occurring on 10 Sept 2026
        self.event = Event.objects.create(
            name='Multi-Day Test Wedding',
            event_date=date(2026, 9, 10),
            location='Grand Palace',
            created_by=self.admin
        )
        self.event.memberships.create(user=self.team_member)

        # Client setups
        self.client = Client()
        self.client.login(username='admin_user', password='password123')

        self.api_client = APIClient()
        self.api_client.force_authenticate(user=self.admin)

    def tearDown(self):
        self.storage_patcher.stop()

    def test_photo_upload_timestamp_is_server_generated(self):
        """Rule 5 & 29: Server automatically assigns uploaded_at upon photo creation."""
        before_creation = timezone.now() - timedelta(seconds=1)
        photo = Photo.objects.create(
            event=self.event,
            uploaded_by=self.team_member,
            filename='server_ts_test.jpg',
            storage_path='events/event_1/server_ts_test.jpg',
            file_size=1024,
            mime_type='image/jpeg'
        )
        after_creation = timezone.now() + timedelta(seconds=1)

        self.assertIsNotNone(photo.uploaded_at)
        self.assertTrue(before_creation <= photo.uploaded_at <= after_creation)

    def test_photos_keep_individual_upload_dates(self):
        """Rule 1 & 29: Each photo retains its individual uploaded_at timestamp."""
        dt_day1 = timezone.make_aware(datetime(2026, 9, 8, 13, 16, 39))
        dt_day2 = timezone.make_aware(datetime(2026, 9, 9, 9, 42, 11))

        photo_a = Photo.objects.create(
            event=self.event,
            uploaded_by=self.team_member,
            filename='photo_a.jpg',
            storage_path='events/event_1/photo_a.jpg',
            file_size=1024,
            mime_type='image/jpeg'
        )
        Photo.objects.filter(id=photo_a.id).update(uploaded_at=dt_day1)
        photo_a.refresh_from_db()

        photo_b = Photo.objects.create(
            event=self.event,
            uploaded_by=self.team_member,
            filename='photo_b.jpg',
            storage_path='events/event_1/photo_b.jpg',
            file_size=1024,
            mime_type='image/jpeg'
        )
        Photo.objects.filter(id=photo_b.id).update(uploaded_at=dt_day2)
        photo_b.refresh_from_db()

        self.assertEqual(photo_a.uploaded_at.date(), date(2026, 9, 8))
        self.assertEqual(photo_b.uploaded_at.date(), date(2026, 9, 9))
        self.assertNotEqual(photo_a.uploaded_at, photo_b.uploaded_at)

    def test_event_date_is_not_used_as_photo_upload_date(self):
        """Rule 3 & 29: Event event_date is separate from Photo uploaded_at."""
        self.assertEqual(self.event.event_date, date(2026, 9, 10))

        dt_photo = timezone.make_aware(datetime(2026, 9, 8, 14, 0, 0))
        photo = Photo.objects.create(
            event=self.event,
            uploaded_by=self.team_member,
            filename='early_shot.jpg',
            storage_path='events/event_1/early_shot.jpg',
            file_size=2048,
            mime_type='image/jpeg'
        )
        Photo.objects.filter(id=photo.id).update(uploaded_at=dt_photo)
        photo.refresh_from_db()

        self.assertNotEqual(photo.uploaded_at.date(), self.event.event_date)
        self.assertEqual(photo.uploaded_at.date(), date(2026, 9, 8))

    def test_photo_ordering_uses_uploaded_at(self):
        """Rule 8 & 29: Photo queries sort deterministically by uploaded_at."""
        dt_old = timezone.make_aware(datetime(2026, 9, 8, 10, 0, 0))
        dt_new = timezone.make_aware(datetime(2026, 9, 9, 15, 0, 0))

        p_old = Photo.objects.create(
            event=self.event,
            uploaded_by=self.team_member,
            filename='old.jpg',
            storage_path='events/event_1/old.jpg',
            file_size=1024,
            mime_type='image/jpeg'
        )
        Photo.objects.filter(id=p_old.id).update(uploaded_at=dt_old)

        p_new = Photo.objects.create(
            event=self.event,
            uploaded_by=self.team_member,
            filename='new.jpg',
            storage_path='events/event_1/new.jpg',
            file_size=1024,
            mime_type='image/jpeg'
        )
        Photo.objects.filter(id=p_new.id).update(uploaded_at=dt_new)

        newest_first = list(Photo.objects.filter(event=self.event).order_by('-uploaded_at', '-id'))
        oldest_first = list(Photo.objects.filter(event=self.event).order_by('uploaded_at', 'id'))

        self.assertEqual(newest_first, [p_new, p_old])
        self.assertEqual(oldest_first, [p_old, p_new])

    def test_date_filter_uses_uploaded_at(self):
        """Rule 10 & 29: Filtering by date returns photos uploaded on that date."""
        dt_day1 = timezone.make_aware(datetime(2026, 9, 8, 11, 0, 0))
        dt_day2 = timezone.make_aware(datetime(2026, 9, 9, 12, 0, 0))

        p1 = Photo.objects.create(
            event=self.event, uploaded_by=self.team_member, filename='d1.jpg',
            storage_path='events/event_1/d1.jpg', file_size=100, mime_type='image/jpeg'
        )
        Photo.objects.filter(id=p1.id).update(uploaded_at=dt_day1)

        p2 = Photo.objects.create(
            event=self.event, uploaded_by=self.team_member, filename='d2.jpg',
            storage_path='events/event_1/d2.jpg', file_size=100, mime_type='image/jpeg'
        )
        Photo.objects.filter(id=p2.id).update(uploaded_at=dt_day2)

        day1_photos = list(Photo.objects.filter(event=self.event, uploaded_at__date='2026-09-08'))
        day2_photos = list(Photo.objects.filter(event=self.event, uploaded_at__date='2026-09-09'))

        self.assertEqual(day1_photos, [p1])
        self.assertEqual(day2_photos, [p2])

    def test_photos_from_different_days_are_not_merged(self):
        """Rule 9 & 29: Photos from 08/09 and 09/09 are kept in separate upload day groups."""
        dt_day1 = timezone.make_aware(datetime(2026, 9, 8, 20, 0, 0))
        dt_day2 = timezone.make_aware(datetime(2026, 9, 9, 8, 0, 0))

        p1 = Photo.objects.create(
            event=self.event, uploaded_by=self.team_member, filename='sep8.jpg',
            storage_path='events/event_1/sep8.jpg', file_size=100, mime_type='image/jpeg'
        )
        Photo.objects.filter(id=p1.id).update(uploaded_at=dt_day1)

        p2 = Photo.objects.create(
            event=self.event, uploaded_by=self.team_member, filename='sep9.jpg',
            storage_path='events/event_1/sep9.jpg', file_size=100, mime_type='image/jpeg'
        )
        Photo.objects.filter(id=p2.id).update(uploaded_at=dt_day2)

        response = self.client.get(f'/photos/event/{self.event.id}/')
        self.assertEqual(response.status_code, 200)

        grouped = response.context.get('grouped_photos')
        self.assertIsNotNone(grouped)
        self.assertEqual(len(grouped), 2)

        group_dates = [g['date_iso'] for g in grouped]
        self.assertIn('2026-09-08', group_dates)
        self.assertIn('2026-09-09', group_dates)

    def test_gallery_creation_does_not_change_photo_uploaded_at(self):
        """Rule 25 & 34: Adding photo to Gallery does not modify its uploaded_at timestamp."""
        dt_upload = timezone.make_aware(datetime(2026, 9, 8, 14, 30, 0))
        photo = Photo.objects.create(
            event=self.event, uploaded_by=self.team_member, filename='to_curate.jpg',
            storage_path='events/event_1/to_curate.jpg', file_size=500, mime_type='image/jpeg'
        )
        Photo.objects.filter(id=photo.id).update(uploaded_at=dt_upload)
        photo.refresh_from_db()

        gallery = Gallery.objects.create(
            event=self.event, title='Live Gallery', slug='live-gallery', is_published=True
        )
        GalleryPhoto.objects.create(gallery=gallery, photo=photo)

        photo.refresh_from_db()
        self.assertEqual(photo.uploaded_at, dt_upload)

    def test_api_photo_list_returns_individual_uploaded_at(self):
        """Rule 30: API returns correct uploaded_at timestamps for each photo."""
        dt_day1 = timezone.make_aware(datetime(2026, 9, 8, 10, 0, 0))
        dt_day2 = timezone.make_aware(datetime(2026, 9, 9, 11, 0, 0))

        p_a = Photo.objects.create(
            event=self.event, uploaded_by=self.team_member, filename='api_a.jpg',
            storage_path='events/event_1/api_a.jpg', file_size=100, mime_type='image/jpeg'
        )
        Photo.objects.filter(id=p_a.id).update(uploaded_at=dt_day1)

        p_b = Photo.objects.create(
            event=self.event, uploaded_by=self.team_member, filename='api_b.jpg',
            storage_path='events/event_1/api_b.jpg', file_size=100, mime_type='image/jpeg'
        )
        Photo.objects.filter(id=p_b.id).update(uploaded_at=dt_day2)

        res = self.api_client.get(f'/api/events/{self.event.id}/photos/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.data.get('data', [])

        self.assertEqual(len(data), 2)
        timestamps = [item['uploaded_at'] for item in data]
        self.assertTrue(any('2026-09-08' in ts for ts in timestamps))
        self.assertTrue(any('2026-09-09' in ts for ts in timestamps))

    def test_timezone_boundary_handling(self):
        """Rule 33: Photos uploaded at 23:59:59 vs 00:00:01 land in different dates."""
        dt1 = timezone.make_aware(datetime(2026, 9, 8, 23, 59, 59))
        dt2 = timezone.make_aware(datetime(2026, 9, 9, 0, 0, 1))

        p1 = Photo.objects.create(
            event=self.event, uploaded_by=self.team_member, filename='midnight_before.jpg',
            storage_path='events/event_1/mb.jpg', file_size=100, mime_type='image/jpeg'
        )
        Photo.objects.filter(id=p1.id).update(uploaded_at=dt1)

        p2 = Photo.objects.create(
            event=self.event, uploaded_by=self.team_member, filename='midnight_after.jpg',
            storage_path='events/event_1/ma.jpg', file_size=100, mime_type='image/jpeg'
        )
        Photo.objects.filter(id=p2.id).update(uploaded_at=dt2)

        p1.refresh_from_db()
        p2.refresh_from_db()

        self.assertEqual(p1.uploaded_at.date(), date(2026, 9, 8))
        self.assertEqual(p2.uploaded_at.date(), date(2026, 9, 9))

    def test_e2e_multi_day_upload_and_gallery_workflow(self):
        """Rule 41: Full multi-day E2E workflow testing Day 1 vs Day 2 uploads & gallery creation."""
        dt_day1 = timezone.make_aware(datetime(2026, 9, 8, 14, 0, 0))
        dt_day2 = timezone.make_aware(datetime(2026, 9, 9, 10, 0, 0))

        # DAY 1 Uploads: Photo A & Photo B
        photo_a = Photo.objects.create(
            event=self.event, uploaded_by=self.team_member, filename='Photo_A.jpg',
            storage_path='events/event_1/photo_a.jpg', file_size=1024, mime_type='image/jpeg'
        )
        Photo.objects.filter(id=photo_a.id).update(uploaded_at=dt_day1)

        photo_b = Photo.objects.create(
            event=self.event, uploaded_by=self.team_member, filename='Photo_B.jpg',
            storage_path='events/event_1/photo_b.jpg', file_size=1024, mime_type='image/jpeg'
        )
        Photo.objects.filter(id=photo_b.id).update(uploaded_at=dt_day1)

        # DAY 2 Uploads: Photo C & Photo D
        photo_c = Photo.objects.create(
            event=self.event, uploaded_by=self.team_member, filename='Photo_C.jpg',
            storage_path='events/event_1/photo_c.jpg', file_size=1024, mime_type='image/jpeg'
        )
        Photo.objects.filter(id=photo_c.id).update(uploaded_at=dt_day2)

        photo_d = Photo.objects.create(
            event=self.event, uploaded_by=self.team_member, filename='Photo_D.jpg',
            storage_path='events/event_1/photo_d.jpg', file_size=1024, mime_type='image/jpeg'
        )
        Photo.objects.filter(id=photo_d.id).update(uploaded_at=dt_day2)

        # Admin opens Photo Review page
        res = self.client.get(f'/photos/event/{self.event.id}/')
        self.assertEqual(res.status_code, 200)

        groups = res.context['grouped_photos']
        self.assertEqual(len(groups), 2)
        self.assertEqual(groups[0]['date_iso'], '2026-09-09')
        self.assertEqual(len(groups[0]['items']), 2)
        self.assertEqual(groups[1]['date_iso'], '2026-09-08')
        self.assertEqual(len(groups[1]['items']), 2)

        # Admin selects Photo B and Photo C and creates customer gallery
        post_data = {
            'photo_ids': [photo_b.id, photo_c.id],
            'pin': '654321',
            'slug': 'curated-gallery'
        }
        res_gal = self.client.post(f'/gallery/create/{self.event.id}/', post_data)
        self.assertIn(res_gal.status_code, [200, 302])

        # Verify photo timestamps remain intact after gallery creation
        photo_b.refresh_from_db()
        photo_c.refresh_from_db()

        self.assertEqual(photo_b.uploaded_at.date(), date(2026, 9, 8))
        self.assertEqual(photo_c.uploaded_at.date(), date(2026, 9, 9))
