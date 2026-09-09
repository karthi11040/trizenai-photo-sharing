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
        """Public registration with TEAM_MEMBER role creates a TEAM_MEMBER account."""
        response = self.client.post(reverse('accounts:register'), {
            'username': 'new_shooter',
            'email': 'shooter@example.com',
            'first_name': 'New',
            'last_name': 'Shooter',
            'role': Role.TEAM_MEMBER,
            'password': 'SecurePassword2026!',
            'confirm_password': 'SecurePassword2026!',
        }, follow=True)

        self.assertEqual(response.status_code, 200)
        user = User.objects.get(username='new_shooter')
        self.assertEqual(user.profile.role, Role.TEAM_MEMBER)
        self.assertFalse(user.is_superuser)
        self.assertFalse(user.profile.is_admin)

    def test_public_registration_cannot_elevate_to_admin(self):
        """Public registration ignores client role parameter and strictly creates TEAM_MEMBER."""
        response = self.client.post(reverse('accounts:register'), {
            'username': 'new_lead_admin',
            'email': 'lead_admin@example.com',
            'first_name': 'Lead',
            'last_name': 'Admin',
            'role': Role.ADMIN,
            'password': 'SecurePassword2026!',
            'confirm_password': 'SecurePassword2026!',
        }, follow=True)

        self.assertEqual(response.status_code, 200)
        user = User.objects.get(username='new_lead_admin')
        self.assertEqual(user.profile.role, Role.TEAM_MEMBER)
        self.assertFalse(user.profile.is_admin)

    def test_distinct_admin_sessions_and_dashboards(self):
        """Different admins have distinct sessions, personalized greetings, and isolated preferences."""
        # Create second admin
        admin2 = User.objects.create_user(
            username='admin_marcus',
            first_name='Marcus',
            last_name='Vance',
            email='marcus@example.com',
            password='MarcusPassword2026!'
        )
        Profile.objects.filter(user=admin2).update(role=Role.ADMIN)

        # Admin 1 logs in
        self.client.login(username='admin_lead', password='AdminPassword2026!')
        self.admin_user.profile.refresh_from_db()
        resp1 = self.client.get(reverse('accounts:admin_dashboard_token', kwargs={'token': self.admin_user.profile.dashboard_token}))
        self.assertEqual(resp1.status_code, 200)
        self.assertContains(resp1, 'admin_lead')
        self.client.logout()

        # Admin 2 logs in
        self.client.login(username='admin_marcus', password='MarcusPassword2026!')
        admin2.profile.refresh_from_db()
        resp2 = self.client.get(reverse('accounts:admin_dashboard_token', kwargs={'token': admin2.profile.dashboard_token}))
        self.assertEqual(resp2.status_code, 200)
        self.assertContains(resp2, 'Marcus')
        self.client.logout()

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
        """Dashboard router redirects Admin to randomized admin dashboard and Team Member to team dashboard."""
        # Test Admin
        self.client.login(username='admin_lead', password='AdminPassword2026!')
        self.admin_user.profile.refresh_from_db()
        response = self.client.get(reverse('accounts:dashboard_router'))
        self.assertRedirects(response, reverse('accounts:admin_dashboard_token', kwargs={'token': self.admin_user.profile.dashboard_token}))
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
        """Admin can access their randomized admin dashboard."""
        self.client.login(username='admin_lead', password='AdminPassword2026!')
        self.admin_user.profile.refresh_from_db()
        response = self.client.get(reverse('accounts:admin_dashboard_token', kwargs={'token': self.admin_user.profile.dashboard_token}))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'admin_lead')

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

    def test_password_cannot_contain_username(self):
        """Password containing the username must be rejected."""
        response = self.client.post(reverse('accounts:register'), {
            'username': 'johndoe',
            'email': 'john@example.com',
            'password': 'Pass_johndoe_2026!',
            'confirm_password': 'Pass_johndoe_2026!',
        })
        self.assertEqual(response.status_code, 200)
        form = response.context['form']
        self.assertTrue(any('username' in err.lower() for err in form.errors.get('password', [])))

    def test_password_cannot_contain_email(self):
        """Password containing the user email or email prefix must be rejected."""
        response = self.client.post(reverse('accounts:register'), {
            'username': 'alexshooter',
            'email': 'alexpro@example.com',
            'password': 'Pass_alexpro_2026!',
            'confirm_password': 'Pass_alexpro_2026!',
        })
        self.assertEqual(response.status_code, 200)
        form = response.context['form']
        self.assertTrue(any('email' in err.lower() for err in form.errors.get('password', [])))

    def test_password_cannot_contain_workspace_name(self):
        """Password containing the workspace or platform name (e.g. TrizenAI / Photo_Sharing_Platform) must be rejected."""
        # 1. Contains trizen
        response1 = self.client.post(reverse('accounts:register'), {
            'username': 'creative_user1',
            'email': 'user1@example.com',
            'password': 'TrizenSecure2026!',
            'confirm_password': 'TrizenSecure2026!',
        })
        self.assertEqual(response1.status_code, 200)
        form1 = response1.context['form']
        self.assertTrue(any('workspace' in err.lower() for err in form1.errors.get('password', [])))

        # 2. Contains photo_sharing_platform
        response2 = self.client.post(reverse('accounts:register'), {
            'username': 'creative_user2',
            'email': 'user2@example.com',
            'password': 'Photo_Sharing_Platform2026!',
            'confirm_password': 'Photo_Sharing_Platform2026!',
        })
        self.assertEqual(response2.status_code, 200)
        form2 = response2.context['form']
        self.assertTrue(any('workspace' in err.lower() for err in form2.errors.get('password', [])))

    def test_password_complexity_enforcement(self):
        """Passwords missing uppercase, lowercase, numbers, or special chars must be rejected."""
        test_cases = [
            ('short1!', 'at least 8 characters'),
            ('alllowercase2026!', 'uppercase letter'),
            ('ALLUPPERCASE2026!', 'lowercase letter'),
            ('NoNumbersHere!', 'number'),
            ('NoSpecialChars2026', 'special character'),
        ]
        for bad_pwd, expected_snippet in test_cases:
            with self.subTest(password=bad_pwd):
                response = self.client.post(reverse('accounts:register'), {
                    'username': f'user_{bad_pwd[:5]}',
                    'email': f'user_{bad_pwd[:5]}@example.com',
                    'password': bad_pwd,
                    'confirm_password': bad_pwd,
                })
                self.assertEqual(response.status_code, 200)
                form = response.context['form']
                self.assertTrue(
                    any(expected_snippet.lower() in err.lower() for err in form.errors.get('password', [])),
                    f"Expected '{expected_snippet}' in {form.errors.get('password')}"
                )

    def test_admin_can_add_team_member_from_roster_page(self):
        """Admin can create a new team member directly from /accounts/team/."""
        self.client.login(username='admin_lead', password='AdminPassword2026!')
        response = self.client.post(reverse('accounts:team_management'), {
            'action': 'add_member',
            'username': 'photographer_maya',
            'first_name': 'Maya',
            'last_name': 'Lin',
            'email': 'maya@trizenai.studio',
            'password': 'MayaSecurePassword2026!',
            'role': 'TEAM_MEMBER',
        }, follow=True)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(User.objects.filter(username='photographer_maya').exists())
        user = User.objects.get(username='photographer_maya')
        self.assertEqual(user.profile.role, Role.TEAM_MEMBER)
        self.assertEqual(user.first_name, 'Maya')
        self.assertEqual(user.last_name, 'Lin')
        self.assertContains(response, 'photographer_maya')

    def test_admin_can_remove_team_member_from_roster_page(self):
        """Admin can remove a team member from /accounts/team/."""
        self.client.login(username='admin_lead', password='AdminPassword2026!')
        to_delete = User.objects.create_user(
            username='temp_shooter',
            email='temp@example.com',
            password='Password123!'
        )
        response = self.client.post(reverse('accounts:team_management'), {
            'action': 'remove_member',
            'user_id': to_delete.id,
        }, follow=True)

        self.assertEqual(response.status_code, 200)
        self.assertFalse(User.objects.filter(username='temp_shooter').exists())


