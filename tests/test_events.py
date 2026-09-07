from datetime import date
from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth.models import User
from events.models import Event, EventMembership
from events.services import EventService
from accounts.models import Role


class EventManagementTests(TestCase):
    def setUp(self):
        self.client = Client()

        # Create Admin user
        self.admin = User.objects.create_superuser(
            username='admin_lead',
            email='lead@example.com',
            password='AdminPassword2026!'
        )

        # Create two Team Members
        self.member1 = User.objects.create_user(
            username='photographer_1',
            email='p1@example.com',
            password='Password2026!'
        )
        self.member2 = User.objects.create_user(
            username='photographer_2',
            email='p2@example.com',
            password='Password2026!'
        )

        # Create an event created by admin
        self.event = EventService.create_event(
            name='Arjun & Priya Wedding',
            event_date=date(2026, 10, 15),
            location='Taj Palace, Mumbai',
            description='Full day coverage',
            created_by=self.admin
        )

    def test_admin_can_create_event_via_view(self):
        """Admin can successfully create a new event."""
        self.client.login(username='admin_lead', password='AdminPassword2026!')
        response = self.client.post(reverse('events:event_create'), {
            'name': 'Corporate Gala 2026',
            'event_date': '2026-11-20',
            'location': 'ITC Grand, Delhi',
            'description': 'Evening corporate gala'
        })
        self.assertEqual(response.status_code, 302)
        self.assertTrue(Event.objects.filter(name='Corporate Gala 2026').exists())

    def test_team_member_cannot_create_event(self):
        """Team member attempting to create an event receives HTTP 403 Forbidden (Rule 32)."""
        self.client.login(username='photographer_1', password='Password2026!')
        response = self.client.post(reverse('events:event_create'), {
            'name': 'Unauthorized Event',
            'event_date': '2026-11-20',
        })
        self.assertEqual(response.status_code, 403)
        self.assertFalse(Event.objects.filter(name='Unauthorized Event').exists())

    def test_admin_can_add_team_member(self):
        """Admin can assign a team member to an event."""
        self.client.login(username='admin_lead', password='AdminPassword2026!')
        response = self.client.post(
            reverse('events:add_member', kwargs={'event_id': self.event.id}),
            {'user': self.member1.id}
        )
        self.assertEqual(response.status_code, 302)
        self.assertTrue(self.event.memberships.filter(user=self.member1).exists())

    def test_duplicate_membership_rejected(self):
        """Attempting to assign an already assigned member fails cleanly."""
        EventService.add_team_member(self.event, self.member1, acting_user=self.admin)
        self.client.login(username='admin_lead', password='AdminPassword2026!')
        response = self.client.post(
            reverse('events:add_member', kwargs={'event_id': self.event.id}),
            {'user': self.member1.id},
            follow=True
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.event.memberships.filter(user=self.member1).count(), 1)

    def test_admin_can_remove_team_member(self):
        """Admin can remove an assigned team member."""
        EventService.add_team_member(self.event, self.member1, acting_user=self.admin)
        self.client.login(username='admin_lead', password='AdminPassword2026!')
        response = self.client.post(
            reverse('events:remove_member', kwargs={'event_id': self.event.id, 'user_id': self.member1.id})
        )
        self.assertEqual(response.status_code, 302)
        self.assertFalse(self.event.memberships.filter(user=self.member1).exists())

    def test_team_member_assigned_events_visibility(self):
        """Team member sees only assigned events and not unassigned events."""
        # Assign member1 to self.event
        EventService.add_team_member(self.event, self.member1, acting_user=self.admin)

        # Create a second event without assigning member1
        event2 = EventService.create_event(
            name='Secret Tech Summit',
            event_date=date(2026, 12, 1),
            created_by=self.admin
        )

        self.client.login(username='photographer_1', password='Password2026!')
        response = self.client.get(reverse('events:assigned_events'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Arjun &amp; Priya Wedding')
        self.assertNotContains(response, 'Secret Tech Summit')

    def test_unassigned_member_blocked_from_event_detail(self):
        """Team member accessing an unassigned event receives HTTP 403 Forbidden (Rule 31)."""
        # photographer_2 is NOT assigned to self.event
        self.client.login(username='photographer_2', password='Password2026!')
        response = self.client.get(reverse('events:event_detail', kwargs={'event_id': self.event.id}))
        self.assertEqual(response.status_code, 403)

    def test_assigned_member_can_access_event_detail(self):
        """Assigned team member can access their event detail view."""
        EventService.add_team_member(self.event, self.member1, acting_user=self.admin)
        self.client.login(username='photographer_1', password='Password2026!')
        response = self.client.get(reverse('events:event_detail', kwargs={'event_id': self.event.id}))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Arjun &amp; Priya Wedding')

    def test_drf_event_apis_and_authorization(self):
        """Verify DRF /api/events/ and /api/events/{id}/members/ enforce RBAC."""
        # 1. Admin creates event via API
        self.client.login(username='admin_lead', password='AdminPassword2026!')
        resp = self.client.post(
            reverse('api_events:api_event_list_create'),
            data={'name': 'API Launch Event', 'event_date': '2026-10-25', 'location': 'Bengaluru'},
            content_type='application/json'
        )
        self.assertEqual(resp.status_code, 201)
        created_id = resp.json()['data']['id']

        # 2. Team member tries to create event via API -> 403
        self.client.login(username='photographer_1', password='Password2026!')
        unauth_resp = self.client.post(
            reverse('api_events:api_event_list_create'),
            data={'name': 'Forbidden API Event', 'event_date': '2026-10-25'},
            content_type='application/json'
        )
        self.assertEqual(unauth_resp.status_code, 403)

        # 3. Admin assigns member via API
        self.client.login(username='admin_lead', password='AdminPassword2026!')
        add_member_resp = self.client.post(
            reverse('api_events:api_event_members', kwargs={'id': created_id}),
            data={'user_id': self.member1.id},
            content_type='application/json'
        )
        self.assertEqual(add_member_resp.status_code, 201)

        # 4. Duplicate assignment returns 409 Conflict
        dup_resp = self.client.post(
            reverse('api_events:api_event_members', kwargs={'id': created_id}),
            data={'user_id': self.member1.id},
            content_type='application/json'
        )
        self.assertEqual(dup_resp.status_code, 409)

        # 5. Team member cannot assign another member -> 403
        self.client.login(username='photographer_1', password='Password2026!')
        member_assign_resp = self.client.post(
            reverse('api_events:api_event_members', kwargs={'id': created_id}),
            data={'user_id': self.member2.id},
            content_type='application/json'
        )
        self.assertEqual(member_assign_resp.status_code, 403)
