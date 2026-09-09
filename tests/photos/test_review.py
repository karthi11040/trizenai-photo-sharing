from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth.models import User
from django.utils import timezone
from accounts.models import Profile
from events.models import Event, EventMembership
from photos.models import Photo
from galleries.models import Gallery, GalleryPhoto


class PhotoReviewCurationTests(TestCase):
    def setUp(self):
        self.client = Client()

        # Create Admin
        self.admin = User.objects.create_user(username='admin_lead', email='admin@trizenai.studio', password='Password123!')
        Profile.objects.filter(user=self.admin).update(role='ADMIN')

        # Create Team Member
        self.shooter = User.objects.create_user(username='shooter_sam', email='sam@trizenai.studio', password='Password123!')
        Profile.objects.filter(user=self.shooter).update(role='TEAM_MEMBER')

        # Create Events
        self.event_a = Event.objects.create(name='Wedding Event A', event_date=timezone.now().date(), created_by=self.admin)
        self.event_b = Event.objects.create(name='Corporate Event B', event_date=timezone.now().date(), created_by=self.admin)

        EventMembership.objects.create(event=self.event_a, user=self.shooter)

        # Upload initial photos to Event A
        self.photo1 = Photo.objects.create(event=self.event_a, uploaded_by=self.shooter, filename='p1.jpg', storage_path='events/1/p1.jpg', file_size=1024, mime_type='image/jpeg')
        self.photo2 = Photo.objects.create(event=self.event_a, uploaded_by=self.shooter, filename='p2.jpg', storage_path='events/1/p2.jpg', file_size=2048, mime_type='image/jpeg')
        self.photo3 = Photo.objects.create(event=self.event_a, uploaded_by=self.shooter, filename='p3.jpg', storage_path='events/1/p3.jpg', file_size=3072, mime_type='image/jpeg')

        # Upload photo to Event B
        self.photo_b = Photo.objects.create(event=self.event_b, uploaded_by=self.admin, filename='pb.jpg', storage_path='events/2/pb.jpg', file_size=4096, mime_type='image/jpeg')

    def test_event_photos_view_renders_event_photos(self):
        self.client.login(username='admin_lead', password='Password123!')
        url = reverse('photos:event_photos', kwargs={'event_id': self.event_a.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'p1.jpg')
        self.assertContains(response, 'p2.jpg')
        self.assertContains(response, 'p3.jpg')
        self.assertNotContains(response, 'pb.jpg')

    def test_photo_selection_persists_in_session(self):
        self.client.login(username='admin_lead', password='Password123!')
        toggle_url = reverse('photos:toggle_photo_select', kwargs={'event_id': self.event_a.id, 'photo_id': self.photo1.id})
        
        # Select photo1
        response = self.client.post(toggle_url, HTTP_HX_REQUEST='true')
        self.assertEqual(response.status_code, 200)

        # Check session
        session_key = f"event_selected_photos_{self.event_a.id}"
        self.assertIn(self.photo1.id, self.client.session.get(session_key, []))

        # Re-render event photos page and verify photo1 is selected
        url = reverse('photos:event_photos', kwargs={'event_id': self.event_a.id})
        res2 = self.client.get(url)
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(res2.context['selected_count'], 1)

    def test_select_all_and_clear_selection(self):
        self.client.login(username='admin_lead', password='Password123!')
        
        # Select all
        select_all_url = reverse('photos:select_all_photos', kwargs={'event_id': self.event_a.id})
        resp = self.client.post(select_all_url, HTTP_HX_REQUEST='true')
        self.assertEqual(resp.status_code, 200)

        session_key = f"event_selected_photos_{self.event_a.id}"
        self.assertEqual(len(self.client.session.get(session_key, [])), 3)

        # Clear selection
        clear_url = reverse('photos:clear_photo_selection', kwargs={'event_id': self.event_a.id})
        resp2 = self.client.post(clear_url, HTTP_HX_REQUEST='true')
        self.assertEqual(resp2.status_code, 200)
        self.assertEqual(len(self.client.session.get(session_key, [])), 0)

    def test_live_photos_polling_detects_new_uploads_unselected(self):
        self.client.login(username='admin_lead', password='Password123!')
        live_url = reverse('photos:live_photos', kwargs={'event_id': self.event_a.id})

        # When known_count == 3 (all current photos), returns 204 No Content
        resp1 = self.client.get(f"{live_url}?known_count=3")
        self.assertEqual(resp1.status_code, 204)

        # Team member uploads photo 4
        photo4 = Photo.objects.create(event=self.event_a, uploaded_by=self.shooter, filename='p4.jpg', storage_path='events/1/p4.jpg', file_size=5120, mime_type='image/jpeg')

        # Polling again with known_count == 3 detects new photo
        resp2 = self.client.get(f"{live_url}?known_count=3")
        self.assertEqual(resp2.status_code, 200)
        self.assertContains(resp2, 'p4.jpg')

        # Verify photo 4 starts UNSELECTED
        session_key = f"event_selected_photos_{self.event_a.id}"
        self.assertNotIn(photo4.id, self.client.session.get(session_key, []))

    def test_gallery_creation_uses_only_selected_photos(self):
        self.client.login(username='admin_lead', password='Password123!')
        
        # Select photo1 & photo2 only
        toggle_url1 = reverse('photos:toggle_photo_select', kwargs={'event_id': self.event_a.id, 'photo_id': self.photo1.id})
        toggle_url2 = reverse('photos:toggle_photo_select', kwargs={'event_id': self.event_a.id, 'photo_id': self.photo2.id})
        self.client.post(toggle_url1, HTTP_HX_REQUEST='true')
        self.client.post(toggle_url2, HTTP_HX_REQUEST='true')

        # Create customer gallery
        create_url = reverse('galleries:gallery_create', kwargs={'event_id': self.event_a.id})
        resp = self.client.post(create_url, HTTP_HX_REQUEST='true')
        self.assertEqual(resp.status_code, 200)

        # Verify gallery photos contain exactly photo1 & photo2 (2 count), NOT photo3
        gallery = Gallery.objects.get(event=self.event_a)
        gp_ids = list(gallery.gallery_photos.values_list('photo_id', flat=True))
        self.assertEqual(len(gp_ids), 2)
        self.assertIn(self.photo1.id, gp_ids)
        self.assertIn(self.photo2.id, gp_ids)
        self.assertNotIn(self.photo3.id, gp_ids)

    def test_gallery_creation_rejects_empty_selection(self):
        self.client.login(username='admin_lead', password='Password123!')
        clear_url = reverse('photos:clear_photo_selection', kwargs={'event_id': self.event_a.id})
        self.client.post(clear_url, HTTP_HX_REQUEST='true')

        create_url = reverse('galleries:gallery_create', kwargs={'event_id': self.event_a.id})
        resp = self.client.post(create_url, HTTP_HX_REQUEST='true')
        self.assertEqual(resp.status_code, 400)
        self.assertFalse(Gallery.objects.filter(event=self.event_a).exists())

    def test_gallery_creation_prevents_cross_event_photos(self):
        self.client.login(username='admin_lead', password='Password123!')
        create_url = reverse('galleries:gallery_create', kwargs={'event_id': self.event_a.id})
        
        # Malicious POST supplying photo from event B into event A gallery
        resp = self.client.post(create_url, {'photo_ids': [self.photo_b.id]}, HTTP_HX_REQUEST='true')
        self.assertEqual(resp.status_code, 400)
        self.assertFalse(Gallery.objects.filter(event=self.event_a).exists())

    def test_team_member_cannot_curate_or_select(self):
        self.client.login(username='shooter_sam', password='Password123!')
        toggle_url = reverse('photos:toggle_photo_select', kwargs={'event_id': self.event_a.id, 'photo_id': self.photo1.id})
        resp = self.client.post(toggle_url, HTTP_HX_REQUEST='true')
        self.assertEqual(resp.status_code, 403)

    def test_new_photos_do_not_automatically_enter_created_gallery(self):
        self.client.login(username='admin_lead', password='Password123!')
        
        # Select all current photos (3)
        select_all_url = reverse('photos:select_all_photos', kwargs={'event_id': self.event_a.id})
        self.client.post(select_all_url, HTTP_HX_REQUEST='true')

        # Create gallery
        create_url = reverse('galleries:gallery_create', kwargs={'event_id': self.event_a.id})
        self.client.post(create_url, HTTP_HX_REQUEST='true')
        gallery = Gallery.objects.get(event=self.event_a)
        self.assertEqual(gallery.gallery_photos.count(), 3)

        # Team member uploads photo 4 after gallery creation
        Photo.objects.create(event=self.event_a, uploaded_by=self.shooter, filename='p4_after.jpg', storage_path='events/1/p4_after.jpg', file_size=100, mime_type='image/jpeg')

        # Verify gallery photos remains strictly 3
        self.assertEqual(gallery.gallery_photos.count(), 3)
