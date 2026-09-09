from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.urls import reverse
from accounts.models import Profile, Role, MemberStatus

class UsernameEditTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.admin_user = User.objects.create_user(
            username='admin_lead',
            email='admin@studio.com',
            password='Password123!',
            is_superuser=True
        )
        p1, _ = Profile.objects.get_or_create(user=self.admin_user)
        p1.role = Role.ADMIN
        p1.status = MemberStatus.ACTIVE
        p1.save()

        self.team_user = User.objects.create_user(
            username='shooter1',
            email='shooter1@studio.com',
            password='Password123!',
            first_name='Alex',
            last_name='Smith'
        )
        p2, _ = Profile.objects.get_or_create(user=self.team_user)
        p2.role = Role.TEAM_MEMBER
        p2.status = MemberStatus.ACTIVE
        p2.save()

    def test_team_member_edit_own_username(self):
        self.client.login(username='shooter1', password='Password123!')
        response = self.client.post(reverse('accounts:my_profile'), {
            'first_name': 'Alex',
            'last_name': 'Smith',
            'username': 'alex_shooter_pro',
            'phone_number': '+15550001111'
        })
        self.assertEqual(response.status_code, 302)
        self.team_user.refresh_from_db()
        self.assertEqual(self.team_user.username, 'alex_shooter_pro')

    def test_team_member_edit_duplicate_username_fails(self):
        self.client.login(username='shooter1', password='Password123!')
        response = self.client.post(reverse('accounts:my_profile'), {
            'first_name': 'Alex',
            'last_name': 'Smith',
            'username': 'admin_lead',  # duplicate
            'phone_number': '+15550001111'
        })
        self.assertEqual(response.status_code, 302)
        self.team_user.refresh_from_db()
        self.assertEqual(self.team_user.username, 'shooter1')

    def test_admin_edit_team_member_username(self):
        self.client.login(username='admin_lead', password='Password123!')
        response = self.client.post(reverse('accounts:team_management'), {
            'action': 'edit_member',
            'user_id': self.team_user.id,
            'first_name': 'Alex',
            'last_name': 'Smith',
            'username': 'alex_updated_by_admin',
            'email': 'shooter1@studio.com',
            'phone_number': '+15550002222',
            'status': MemberStatus.ACTIVE
        })
        self.assertEqual(response.status_code, 302)
        self.team_user.refresh_from_db()
        self.assertEqual(self.team_user.username, 'alex_updated_by_admin')

    def test_admin_add_team_member_with_custom_username(self):
        self.client.login(username='admin_lead', password='Password123!')
        response = self.client.post(reverse('accounts:team_management'), {
            'action': 'add_member',
            'first_name': 'John',
            'last_name': 'Doe',
            'email': 'john.doe@studio.com',
            'username': 'johndoe_custom',
            'phone_number': '+15559998888'
        })
        self.assertEqual(response.status_code, 302)
        new_user = User.objects.get(email='john.doe@studio.com')
        self.assertEqual(new_user.username, 'johndoe_custom')
