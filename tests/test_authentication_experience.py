from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth.models import User
from accounts.models import Profile, Role, MemberStatus


class AuthenticationAndSecurityExperienceTests(TestCase):
    """
    Automated test suite verifying the complete Authentication, Admin Account Management,
    Team Member Management, and Secure Session experience.
    """

    def setUp(self):
        self.client = Client()

        # Admin Lead
        self.admin = User.objects.create_superuser(
            username='lead_admin',
            email='lead@trizenai.studio',
            password='AdminPassword2026!'
        )
        self.admin_profile, _ = Profile.objects.get_or_create(user=self.admin)
        self.admin_profile.role = Role.ADMIN
        self.admin_profile.status = MemberStatus.ACTIVE
        self.admin_profile.save()

        # Team Member
        self.member = User.objects.create_user(
            username='shooter_alex',
            email='alex@trizenai.studio',
            password='TeamMember2026!',
            first_name='Alex',
            last_name='Kumar'
        )
        self.member_profile, _ = Profile.objects.get_or_create(user=self.member)
        self.member_profile.role = Role.TEAM_MEMBER
        self.member_profile.status = MemberStatus.ACTIVE
        self.member_profile.save()

    def test_login_with_username_and_email(self):
        """User can sign in using either username or email address."""
        # 1. Login with username
        resp1 = self.client.post(reverse('accounts:login'), {
            'username': 'lead_admin',
            'password': 'AdminPassword2026!',
        }, follow=True)
        self.assertEqual(resp1.status_code, 200)
        self.assertTrue(resp1.context['user'].is_authenticated)
        self.client.logout()

        # 2. Login with email
        resp2 = self.client.post(reverse('accounts:login'), {
            'username': 'lead@trizenai.studio',
            'password': 'AdminPassword2026!',
        }, follow=True)
        self.assertEqual(resp2.status_code, 200)
        self.assertTrue(resp2.context['user'].is_authenticated)

    def test_login_session_rotation(self):
        """Session key is securely rotated upon successful authentication."""
        self.client.get(reverse('accounts:login'))
        old_session_key = self.client.session.session_key

        self.client.post(reverse('accounts:login'), {
            'username': 'lead_admin',
            'password': 'AdminPassword2026!',
        })
        new_session_key = self.client.session.session_key
        self.assertNotEqual(old_session_key, new_session_key)

    def test_logout_invalidates_session(self):
        """Logout flushes session and redirects to sign in."""
        self.client.login(username='lead_admin', password='AdminPassword2026!')
        response = self.client.get(reverse('accounts:logout'), follow=True)
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.context['user'].is_authenticated)

    def test_public_registration_strictly_creates_team_member(self):
        """Public registration cannot be manipulated to create Admin accounts."""
        response = self.client.post(reverse('accounts:register'), {
            'username': 'new_registrant',
            'email': 'new@trizenai.studio',
            'first_name': 'New',
            'last_name': 'User',
            'password': 'SecurePass2026!',
            'confirm_password': 'SecurePass2026!',
            'role': 'ADMIN',  # Malicious attempt to self-promote
        }, follow=True)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(User.objects.filter(username='new_registrant').exists())
        new_user = User.objects.get(username='new_registrant')
        
        # Must be strictly TEAM_MEMBER
        self.assertEqual(new_user.profile.role, Role.TEAM_MEMBER)
        self.assertFalse(new_user.is_staff)
        self.assertFalse(new_user.is_superuser)

    def test_admin_can_create_another_admin_from_protected_hub(self):
        """Admin can create another Administrator from the protected /accounts/administrators/ interface."""
        self.client.login(username='lead_admin', password='AdminPassword2026!')
        response = self.client.post(reverse('accounts:administrators_list'), {
            'action': 'add_admin',
            'first_name': 'Maya',
            'last_name': 'Lin',
            'email': 'maya.admin@trizenai.studio',
            'phone_number': '+1 (555) 777-8888',
        }, follow=True)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(User.objects.filter(email='maya.admin@trizenai.studio').exists())
        maya = User.objects.get(email='maya.admin@trizenai.studio')
        self.assertEqual(maya.profile.role, Role.ADMIN)
        self.assertTrue(maya.is_staff)
        self.assertEqual(maya.profile.status, MemberStatus.PENDING)

    def test_team_member_forbidden_from_admin_management(self):
        """Team member gets HTTP 403 Forbidden when trying to access /accounts/administrators/."""
        self.client.login(username='shooter_alex', password='TeamMember2026!')
        response = self.client.get(reverse('accounts:administrators_list'))
        self.assertEqual(response.status_code, 403)

    def test_admin_cannot_self_deactivate(self):
        """Admin is prevented from deactivating their own administrator account."""
        self.client.login(username='lead_admin', password='AdminPassword2026!')
        response = self.client.post(reverse('accounts:administrators_list'), {
            'action': 'deactivate_admin',
            'user_id': self.admin.id,
        }, follow=True)

        self.assertEqual(response.status_code, 200)
        self.admin_profile.refresh_from_db()
        self.assertEqual(self.admin_profile.status, MemberStatus.ACTIVE)

    def test_account_activation_flow(self):
        """Invited member can activate account and set password."""
        # Create pending invite user
        pending_user = User.objects.create_user(
            username='invited_shooter',
            email='invited@trizenai.studio',
            password='TempPassword2026!'
        )
        p_profile, _ = Profile.objects.get_or_create(user=pending_user)
        p_profile.role = Role.TEAM_MEMBER
        p_profile.status = MemberStatus.PENDING
        p_profile.save()

        response = self.client.post(reverse('accounts:account_activation'), {
            'email': 'invited@trizenai.studio',
            'first_name': 'David',
            'last_name': 'Kim',
            'password': 'DavidNewPassword2026!',
            'confirm_password': 'DavidNewPassword2026!',
        }, follow=True)

        self.assertEqual(response.status_code, 200)
        pending_user.refresh_from_db()
        self.assertEqual(pending_user.first_name, 'David')
        self.assertEqual(pending_user.last_name, 'Kim')
        self.assertEqual(pending_user.profile.status, MemberStatus.ACTIVE)
        # Role must remain TEAM_MEMBER
        self.assertEqual(pending_user.profile.role, Role.TEAM_MEMBER)

    def test_password_reset_request_and_done(self):
        """Forgot password submission returns generic confirmation."""
        response = self.client.post(reverse('accounts:password_reset'), {
            'email': 'alex@trizenai.studio',
        }, follow=True)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Check your email')
