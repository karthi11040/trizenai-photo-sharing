from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth.models import User
from accounts.models import Profile, Role


class AuthenticationAndRBACTests(TestCase):
    def setUp(self):
        self.client = Client()
        # Create an existing admin user (via standard process / createsuperuser simulation)
        self.admin_user = User.objects.create_superuser(
            username='admin_lead',
            email='lead@example.com',
            password='AdminPassword2026!'
        )
        # Create an existing team member
        self.team_user = User.objects.create_user(
            username='photographer_sam',
            email='sam@example.com',
            password='SamPassword2026!'
        )
        # Verify signal created profiles
        self.assertTrue(hasattr(self.admin_user, 'profile'))
        self.assertEqual(self.admin_user.profile.role, Role.ADMIN)
        self.assertTrue(self.admin_user.profile.is_admin)

        self.assertTrue(hasattr(self.team_user, 'profile'))
        self.assertEqual(self.team_user.profile.role, Role.TEAM_MEMBER)
        self.assertTrue(self.team_user.profile.is_team_member)

    def test_public_registration_creates_team_member(self):
        """Public registration must always create a TEAM_MEMBER account."""
        response = self.client.post(reverse('accounts:register'), {
            'username': 'new_shooter',
            'email': 'shooter@example.com',
            'password': 'SecurePassword2026!',
            'confirm_password': 'SecurePassword2026!',
        }, follow=True)

        self.assertEqual(response.status_code, 200)
        user = User.objects.get(username='new_shooter')
        self.assertEqual(user.profile.role, Role.TEAM_MEMBER)
        self.assertFalse(user.is_superuser)
        self.assertFalse(user.profile.is_admin)

    def test_public_registration_blocks_admin_tampering(self):
        """A user must never be able to submit role=ADMIN and become an administrator (Rule 22)."""
        response = self.client.post(reverse('accounts:register'), {
            'username': 'hacker_trying_admin',
            'email': 'hacker@example.com',
            'password': 'SecurePassword2026!',
            'confirm_password': 'SecurePassword2026!',
            'role': 'ADMIN',  # Malicious client injection
            'is_superuser': True,
        }, follow=True)

        self.assertEqual(response.status_code, 200)
        user = User.objects.get(username='hacker_trying_admin')
        self.assertEqual(user.profile.role, Role.TEAM_MEMBER)
        self.assertFalse(user.is_superuser)
        self.assertFalse(user.profile.is_admin)

    def test_duplicate_registration_rejected(self):
        """Duplicate username or email must be rejected with validation errors."""
        response = self.client.post(reverse('accounts:register'), {
            'username': 'photographer_sam',  # Already exists
            'email': 'unique@example.com',
            'password': 'SecurePassword2026!',
            'confirm_password': 'SecurePassword2026!',
        })
        self.assertEqual(response.status_code, 200)
        self.assertFormError(response.context['form'], 'username', 'A user with that username already exists.')

    def test_valid_login_and_logout(self):
        """Valid credentials log the user in and logout terminates the session."""
        login_response = self.client.post(reverse('accounts:login'), {
            'username': 'photographer_sam',
            'password': 'SamPassword2026!',
        })
        self.assertEqual(login_response.status_code, 302)
        self.assertTrue('_auth_user_id' in self.client.session)

        logout_response = self.client.post(reverse('accounts:logout'))
        self.assertEqual(logout_response.status_code, 302)
        self.assertFalse('_auth_user_id' in self.client.session)

    def test_invalid_login_rejected(self):
        """Invalid credentials fail authentication."""
        response = self.client.post(reverse('accounts:login'), {
            'username': 'photographer_sam',
            'password': 'WrongPassword!',
        })
        self.assertEqual(response.status_code, 200)
        self.assertFalse('_auth_user_id' in self.client.session)

    def test_dashboard_routing_by_role(self):
        """Dashboard router redirects Admin to admin dashboard and Team Member to team dashboard."""
        # Test Admin
        self.client.login(username='admin_lead', password='AdminPassword2026!')
        response = self.client.get(reverse('accounts:dashboard_router'))
        self.assertRedirects(response, reverse('accounts:admin_dashboard'))
        self.client.logout()

        # Test Team Member
        self.client.login(username='photographer_sam', password='SamPassword2026!')
        response = self.client.get(reverse('accounts:dashboard_router'))
        self.assertRedirects(response, reverse('accounts:team_dashboard'))

    def test_team_member_forbidden_from_admin_dashboard(self):
        """Team member accessing admin dashboard must receive HTTP 403 Forbidden."""
        self.client.login(username='photographer_sam', password='SamPassword2026!')
        response = self.client.get(reverse('accounts:admin_dashboard'))
        self.assertEqual(response.status_code, 403)

    def test_admin_can_access_admin_dashboard(self):
        """Admin can access admin dashboard."""
        self.client.login(username='admin_lead', password='AdminPassword2026!')
        response = self.client.get(reverse('accounts:admin_dashboard'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Lead Dashboard')

    def test_api_authentication_workflow(self):
        """Verify DRF API login, me, and logout adhere to API contract."""
        # 1. API Login
        login_resp = self.client.post(
            reverse('api_auth:api_login'),
            data={'username': 'admin_lead', 'password': 'AdminPassword2026!'},
            content_type='application/json'
        )
        self.assertEqual(login_resp.status_code, 200)
        login_data = login_resp.json()
        self.assertTrue(login_data.get('success'))
        self.assertEqual(login_data['data']['user']['username'], 'admin_lead')
        self.assertEqual(login_data['data']['user']['role'], 'ADMIN')

        # 2. API Me
        me_resp = self.client.get(reverse('api_auth:api_me'))
        self.assertEqual(me_resp.status_code, 200)
        me_data = me_resp.json()
        self.assertTrue(me_data.get('success'))
        self.assertEqual(me_data['data']['role'], 'ADMIN')

        # 3. API Logout
        logout_resp = self.client.post(reverse('api_auth:api_logout'))
        self.assertEqual(logout_resp.status_code, 200)
        logout_data = logout_resp.json()
        self.assertTrue(logout_data.get('success'))

        # 4. API Me after logout returns 401 / 403
        unauth_resp = self.client.get(reverse('api_auth:api_me'))
        self.assertIn(unauth_resp.status_code, [401, 403])
