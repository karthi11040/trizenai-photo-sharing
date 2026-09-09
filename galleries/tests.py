from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.urls import reverse
from accounts.models import Profile, Role, MemberStatus
from events.models import Event
from galleries.models import Gallery

class StudioBrandNameTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin_studio_lead',
            email='admin@auravision.com',
            password='Password123!',
            is_superuser=True
        )
        p, _ = Profile.objects.get_or_create(user=self.admin)
        p.role = Role.ADMIN
        p.status = MemberStatus.ACTIVE
        p.studio_name = 'Aura Vision Studios'
        p.save()
        self.admin.refresh_from_db()

        self.event = Event.objects.create(
            name='Royal Wedding 2026',
            event_date='2026-09-08',
            location='Grand Ballroom',
            created_by=self.admin
        )
        self.gallery = Gallery.objects.create(
            event=self.event,
            title='Royal Wedding 2026',
            slug='royal-wedding-2026',
            is_published=True
        )
        self.gallery.set_pin('123456')

    def test_saved_studio_brand_name_saved_in_settings(self):
        self.client.login(username='admin_studio_lead', password='Password123!')
        response = self.client.post(reverse('accounts:studio_settings'), {
            'action': 'profile_update',
            'studio_name': 'Aura Vision Studios',
            'contact_email': 'contact@auravision.com'
        })
        self.assertEqual(response.status_code, 302)
        self.admin.profile.refresh_from_db()
        self.assertEqual(self.admin.profile.studio_name, 'Aura Vision Studios')

    def test_live_gallery_displays_saved_studio_brand_name(self):
        session = self.client.session
        session[f"gallery_token_{self.gallery.id}"] = "valid_token_123"
        session[f"gallery_last_active_{self.gallery.id}"] = 9999999999
        session.save()

        url = reverse('galleries:customer_gallery_view', kwargs={
            'slug': self.gallery.slug,
            'session_token': 'valid_token_123'
        })
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.context['studio_name'], 'Aura Vision Studios')
        self.assertContains(response, 'Aura Vision Studios')
