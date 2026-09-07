from django.test import TestCase, Client
from django.urls import reverse
from django.conf import settings


class ProjectScaffoldingTests(TestCase):
    def setUp(self):
        self.client = Client()

    def test_health_check_endpoint(self):
        """Verify the health check endpoint returns 200 OK and database connectivity."""
        response = self.client.get(reverse('health_check'))
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data.get('status'), 'ok')
        self.assertEqual(data.get('database'), 'ok')

    def test_home_page_loads(self):
        """Verify landing page renders successfully."""
        response = self.client.get(reverse('home'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Trizen')

    def test_installed_apps_configuration(self):
        """Verify all local domain applications and third-party tools are loaded."""
        installed_apps = settings.INSTALLED_APPS
        self.assertIn('rest_framework', installed_apps)
        self.assertIn('accounts.apps.AccountsConfig', installed_apps)
        self.assertIn('events.apps.EventsConfig', installed_apps)
        self.assertIn('photos.apps.PhotosConfig', installed_apps)
        self.assertIn('galleries.apps.GalleriesConfig', installed_apps)
