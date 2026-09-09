from datetime import date
from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth.models import User
from accounts.models import Profile, Role, MemberStatus
from events.models import Event, EventMembership
from photos.models import Photo


class WorkspaceTeamManagementTests(TestCase):
    """
    Comprehensive test suite for the Admin Workspace Team Management experience:
    - 4 Summary Cards (Total Members, Active Members, Pending Invitations, Events Covered)
    - Admin-only access enforcement
    - Add Team Member (strictly TEAM_MEMBER role + multi-event assignment)
    - Invitation success state & link generation
    - Edit member & status toggles (Active vs Suspended)
    - Deactivate & Reactivate flows
    - Photo preservation upon member removal
    - Member Details JSON API (Overview, Assigned Events, Uploaded Photos)
    """

    def setUp(self):
        self.client = Client()

        # 1. Workspace Admin Lead
        self.admin = User.objects.create_superuser(
            username='studio_admin',
            email='admin@trizenai.studio',
            password='AdminPassword2026!'
        )
        self.admin_profile, _ = Profile.objects.get_or_create(user=self.admin)
        self.admin_profile.role = Role.ADMIN
        self.admin_profile.status = MemberStatus.ACTIVE
        self.admin_profile.save()

        # 2. Existing Team Member (Active)
        self.member_alex = User.objects.create_user(
            username='photographer_alex',
            email='alex@trizenai.studio',
            password='TeamMember2026!',
            first_name='Alex',
            last_name='Kumar'
        )
        self.profile_alex, _ = Profile.objects.get_or_create(user=self.member_alex)
        self.profile_alex.role = Role.TEAM_MEMBER
        self.profile_alex.status = MemberStatus.ACTIVE
        self.profile_alex.phone_number = '+1 (555) 234-5678'
        self.profile_alex.save()

        # 3. Existing Team Member (Pending)
        self.member_marcus = User.objects.create_user(
            username='photographer_marcus',
            email='marcus@trizenai.studio',
            password='TeamMember2026!',
            first_name='Marcus',
            last_name='Vance'
        )
        self.profile_marcus, _ = Profile.objects.get_or_create(user=self.member_marcus)
        self.profile_marcus.role = Role.TEAM_MEMBER
        self.profile_marcus.status = MemberStatus.PENDING
        self.profile_marcus.save()

        # 4. Studio Events
        self.event1 = Event.objects.create(
            name='Arjun & Priya Wedding Gala',
            event_date=date(2026, 9, 18),
            location='Chennai',
            created_by=self.admin
        )
        self.event2 = Event.objects.create(
            name='Apex Global Keynote',
            event_date=date(2026, 9, 20),
            location='Bangalore',
            created_by=self.admin
        )

        # Assign Alex to Event 1
        EventMembership.objects.create(event=self.event1, user=self.member_alex)

        # Create sample photo by Alex in Event 1
        self.photo1 = Photo.objects.create(
            event=self.event1,
            uploaded_by=self.member_alex,
            filename='APW_001.jpg',
            storage_path='events/1/APW_001.jpg',
            file_size=2450000,
            mime_type='image/jpeg'
        )

    def test_team_member_cannot_access_team_management(self):
        """Team members must NOT have access to workspace team management (HTTP 403 PermissionDenied)."""
        self.client.login(username='photographer_alex', password='TeamMember2026!')
        response = self.client.get(reverse('accounts:team_management'))
        self.assertEqual(response.status_code, 403)

    def test_admin_can_view_team_management_dashboard_and_summary_cards(self):
        """Admin can view the Team management hub with all summary cards and member list."""
        self.client.login(username='studio_admin', password='AdminPassword2026!')
        response = self.client.get(reverse('accounts:team_management'))
        self.assertEqual(response.status_code, 200)

        # Verify page title and subtitle
        self.assertContains(response, 'Team')
        self.assertContains(response, 'Manage the people who collaborate on your events.')
        self.assertContains(response, '+ Add Team Member')

        # Verify 4 Summary Cards in context
        self.assertEqual(response.context['total_members_count'], 3)
        self.assertEqual(response.context['active_members_count'], 2)  # Admin + Alex
        self.assertEqual(response.context['pending_members_count'], 1)  # Marcus
        self.assertEqual(response.context['events_covered_count'], 1)  # Event 1

        # Verify Alex Kumar and Marcus Vance are listed
        self.assertContains(response, 'Alex Kumar')
        self.assertContains(response, 'Marcus Vance')

    def test_admin_invite_team_member_with_event_assignment(self):
        """Admin can invite a new team member with multi-event assignment and phone number."""
        self.client.login(username='studio_admin', password='AdminPassword2026!')
        response = self.client.post(reverse('accounts:team_management'), {
            'action': 'add_member',
            'full_name': 'Sarah Jenkins',
            'email': 'sarah@trizenai.studio',
            'phone_number': '+1 (555) 987-6543',
            'event_ids': [str(self.event1.id), str(self.event2.id)],
        }, follow=True)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(User.objects.filter(email='sarah@trizenai.studio').exists())
        sarah = User.objects.get(email='sarah@trizenai.studio')
        
        # Verify role is strictly TEAM_MEMBER and status is PENDING
        self.assertEqual(sarah.profile.role, Role.TEAM_MEMBER)
        self.assertEqual(sarah.profile.status, MemberStatus.PENDING)
        self.assertEqual(sarah.profile.phone_number, '+1 (555) 987-6543')
        self.assertIsNotNone(sarah.profile.invitation_sent_at)

        # Verify events assigned
        self.assertTrue(EventMembership.objects.filter(event=self.event1, user=sarah).exists())
        self.assertTrue(EventMembership.objects.filter(event=self.event2, user=sarah).exists())

    def test_admin_edit_member_details_and_status(self):
        """Admin can edit member name, email, phone, status, and assigned events."""
        self.client.login(username='studio_admin', password='AdminPassword2026!')
        response = self.client.post(reverse('accounts:team_management'), {
            'action': 'edit_member',
            'user_id': self.member_alex.id,
            'first_name': 'Alexander',
            'last_name': 'Kumar-Singh',
            'email': 'alex.singh@trizenai.studio',
            'phone_number': '+1 (555) 999-8888',
            'status': MemberStatus.ACTIVE,
            'event_ids': [str(self.event2.id)],  # Move to Event 2
        }, follow=True)

        self.assertEqual(response.status_code, 200)
        self.member_alex.refresh_from_db()
        self.assertEqual(self.member_alex.first_name, 'Alexander')
        self.assertEqual(self.member_alex.last_name, 'Kumar-Singh')
        self.assertEqual(self.member_alex.email, 'alex.singh@trizenai.studio')
        self.assertEqual(self.member_alex.profile.phone_number, '+1 (555) 999-8888')

        # Event memberships updated
        self.assertFalse(EventMembership.objects.filter(event=self.event1, user=self.member_alex).exists())
        self.assertTrue(EventMembership.objects.filter(event=self.event2, user=self.member_alex).exists())

    def test_admin_deactivate_and_activate_member(self):
        """Admin can deactivate (suspend) and reactivate team members."""
        self.client.login(username='studio_admin', password='AdminPassword2026!')
        
        # 1. Deactivate
        self.client.post(reverse('accounts:team_management'), {
            'action': 'deactivate_member',
            'user_id': self.member_alex.id,
        })
        self.member_alex.profile.refresh_from_db()
        self.assertEqual(self.member_alex.profile.status, MemberStatus.SUSPENDED)
        self.assertTrue(self.member_alex.profile.is_suspended)

        # 2. Reactivate
        self.client.post(reverse('accounts:team_management'), {
            'action': 'activate_member',
            'user_id': self.member_alex.id,
        })
        self.member_alex.profile.refresh_from_db()
        self.assertEqual(self.member_alex.profile.status, MemberStatus.ACTIVE)
        self.assertTrue(self.member_alex.profile.is_active_member)

    def test_admin_remove_member_preserves_uploaded_photos(self):
        """When a member is removed, their workspace access is revoked, but uploaded photos remain preserved."""
        self.client.login(username='studio_admin', password='AdminPassword2026!')
        
        self.assertTrue(Photo.objects.filter(id=self.photo1.id).exists())
        self.assertTrue(EventMembership.objects.filter(event=self.event1, user=self.member_alex).exists())

        response = self.client.post(reverse('accounts:team_management'), {
            'action': 'remove_member',
            'user_id': self.member_alex.id,
        }, follow=True)

        self.assertEqual(response.status_code, 200)
        
        # Event memberships revoked
        self.assertFalse(EventMembership.objects.filter(event=self.event1, user=self.member_alex).exists())
        
        # Photo is 100% preserved in the database
        self.photo1.refresh_from_db()
        self.assertTrue(Photo.objects.filter(id=self.photo1.id).exists())
        self.assertEqual(self.photo1.event, self.event1)

    def test_team_member_details_api(self):
        """Team member details API returns structured JSON for the 3-tab drawer."""
        self.client.login(username='studio_admin', password='AdminPassword2026!')
        response = self.client.get(reverse('accounts:team_member_details_api', kwargs={'member_id': self.member_alex.id}))
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        self.assertEqual(data['full_name'], 'Alex Kumar')
        self.assertEqual(data['role'], 'Team Member')
        self.assertEqual(data['status'], 'ACTIVE')
        self.assertEqual(data['assigned_events_count'], 1)
        self.assertEqual(data['photos_uploaded_count'], 1)
        self.assertEqual(len(data['assigned_events']), 1)
        self.assertEqual(data['assigned_events'][0]['name'], 'Arjun & Priya Wedding Gala')
        self.assertEqual(len(data['uploaded_photos']), 1)
        self.assertEqual(data['uploaded_photos'][0]['filename'], 'APW_001.jpg')
