from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from accounts.models import Profile, Role


class Command(BaseCommand):
    help = "Seed demo credentials for Admin and Team Members for the TrizenAI submission"

    def handle(self, *args, **options):
        # 1. Demo Admin
        admin_user, created = User.objects.get_or_create(
            username="admin_lead",
            defaults={"email": "admin@trizenai.internal", "is_staff": True, "is_superuser": True}
        )
        admin_user.set_password("AdminPassword2026!")
        admin_user.is_staff = True
        admin_user.is_superuser = True
        admin_user.save()

        admin_profile, _ = Profile.objects.get_or_create(user=admin_user)
        admin_profile.role = Role.ADMIN
        admin_profile.save()
        self.stdout.write(self.style.SUCCESS("✓ Admin user created/updated: admin_lead (password: AdminPassword2026!)"))

        # 2. Demo Team Member 1 - Active
        member1, _ = User.objects.get_or_create(
            username="photographer_alex",
            defaults={"email": "alex@trizenai.internal", "first_name": "Alex", "last_name": "Kumar"}
        )
        member1.first_name = "Alex"
        member1.last_name = "Kumar"
        member1.email = "alex@trizenai.internal"
        member1.set_password("TeamMember2026!")
        member1.save()
        profile1, _ = Profile.objects.get_or_create(user=member1)
        profile1.role = Role.TEAM_MEMBER
        profile1.status = "ACTIVE"
        profile1.phone_number = "+1 (555) 234-8901"
        profile1.save()
        self.stdout.write(self.style.SUCCESS("✓ Team Member 1 created/updated: Alex Kumar (Active)"))

        # 3. Demo Team Member 2 - Active
        member2, _ = User.objects.get_or_create(
            username="photographer_priya",
            defaults={"email": "priya@trizenai.internal", "first_name": "Priya", "last_name": "Sharma"}
        )
        member2.first_name = "Priya"
        member2.last_name = "Sharma"
        member2.email = "priya@trizenai.internal"
        member2.set_password("TeamMember2026!")
        member2.save()
        profile2, _ = Profile.objects.get_or_create(user=member2)
        profile2.role = Role.TEAM_MEMBER
        profile2.status = "ACTIVE"
        profile2.phone_number = "+1 (555) 678-1234"
        profile2.save()
        self.stdout.write(self.style.SUCCESS("✓ Team Member 2 created/updated: Priya Sharma (Active)"))

        # 4. Demo Team Member 3 - Pending Invitation
        from django.utils import timezone
        member3, _ = User.objects.get_or_create(
            username="photographer_marcus",
            defaults={"email": "marcus.vance@trizenai.internal", "first_name": "Marcus", "last_name": "Vance"}
        )
        member3.first_name = "Marcus"
        member3.last_name = "Vance"
        member3.email = "marcus.vance@trizenai.internal"
        member3.set_password("TeamMember2026!")
        member3.save()
        profile3, _ = Profile.objects.get_or_create(user=member3)
        profile3.role = Role.TEAM_MEMBER
        profile3.status = "PENDING"
        profile3.phone_number = "+1 (555) 890-4321"
        profile3.invitation_sent_at = timezone.now()
        profile3.save()
        self.stdout.write(self.style.SUCCESS("✓ Team Member 3 created/updated: Marcus Vance (Pending)"))

        # 5. Demo Team Member 4 - Suspended
        member4, _ = User.objects.get_or_create(
            username="photographer_elena",
            defaults={"email": "elena.r@trizenai.internal", "first_name": "Elena", "last_name": "Rostova"}
        )
        member4.first_name = "Elena"
        member4.last_name = "Rostova"
        member4.email = "elena.r@trizenai.internal"
        member4.set_password("TeamMember2026!")
        member4.save()
        profile4, _ = Profile.objects.get_or_create(user=member4)
        profile4.role = Role.TEAM_MEMBER
        profile4.status = "SUSPENDED"
        profile4.phone_number = "+1 (555) 345-9876"
        profile4.save()
        self.stdout.write(self.style.SUCCESS("✓ Team Member 4 created/updated: Elena Rostova (Suspended)"))

        # 4. Demo Events from Studio Mockup
        from datetime import date
        from events.models import Event, EventMembership
        from photos.models import Photo

        e1, _ = Event.objects.get_or_create(
            name="Arjun & Priya Wedding Gala",
            defaults={
                "location": "St. Regis Ballroom",
                "event_date": date(2025, 10, 24),
                "created_by": admin_user,
                "description": "Grand multi-ceremony wedding celebrations at St. Regis."
            }
        )
        EventMembership.objects.get_or_create(event=e1, user=member1)
        EventMembership.objects.get_or_create(event=e1, user=member2)

        e2, _ = Event.objects.get_or_create(
            name="Apex Global Summit 2025",
            defaults={
                "location": "Metropolitan Pavilion",
                "event_date": date(2025, 10, 22),
                "created_by": admin_user,
                "description": "Annual international tech and leadership keynote event."
            }
        )
        EventMembership.objects.get_or_create(event=e2, user=member1)

        e3, _ = Event.objects.get_or_create(
            name="Vogue Autumn Editorial Shoot",
            defaults={
                "location": "Studio Loft A",
                "event_date": date(2025, 10, 19),
                "created_by": admin_user,
                "description": "High fashion seasonal editorial and catalog shoot."
            }
        )
        EventMembership.objects.get_or_create(event=e3, user=member2)

        # Seed sample photos if none exist
        if not e1.photos.exists():
            sample_photos_data = [
                ("APW_0428.CR3", "Ceremony • Marcus Cole", 4500000, "image/jpeg", 6000, 4000),
                ("APW_0512.ARW", "Ring Exchange • Sarah J.", 5200000, "image/jpeg", 6000, 4000),
                ("APW_0602.NEF", "Portraits • Elena Vance", 4800000, "image/jpeg", 6000, 4000),
                ("APW_0710.CR3", "Reception Entry • Marcus C.", 5100000, "image/jpeg", 6000, 4000),
                ("APW_0780.CR3", "Decor & Floral • David Kim", 3900000, "image/jpeg", 6000, 4000),
                ("APW_0812.ARW", "First Dance • Sarah J.", 4900000, "image/jpeg", 6000, 4000),
                ("APW_0842.JPG", "Baraat • Marcus Cole", 3200000, "image/jpeg", 6000, 4000),
                ("APW_0890.JPG", "Ritual • Elena Vance", 3400000, "image/jpeg", 6000, 4000),
                ("APW_0915.CR3", "Venue • David Kim", 4200000, "image/jpeg", 6000, 4000),
                ("APW_0944.ARW", "Cake Cut • Sarah J.", 4700000, "image/jpeg", 6000, 4000),
                ("APW_0988.CR3", "Sangeet • Marcus C.", 5300000, "image/jpeg", 6000, 4000),
                ("APW_1020.NEF", "Vidai • Elena Vance", 4600000, "image/jpeg", 6000, 4000),
            ]
            for idx, (fname, caption, fsize, mime, w, h) in enumerate(sample_photos_data, start=1):
                Photo.objects.create(
                    event=e1,
                    uploaded_by=member1 if idx % 2 == 0 else member2,
                    filename=fname,
                    storage_path=f"events/{e1.id}/demo_photo_{idx:03d}.jpg",
                    file_size=fsize,
                    mime_type=mime,
                    width=w,
                    height=h
                )
            self.stdout.write(self.style.SUCCESS(f"✓ Seeded {len(sample_photos_data)} sample photos for {e1.name}"))

        self.stdout.write(self.style.SUCCESS("✓ Demo events seeded: 'Arjun & Priya Wedding Gala', 'Apex Global Summit 2025', 'Vogue Autumn Editorial Shoot'"))
        self.stdout.write(self.style.SUCCESS("All demo credentials & studio events successfully seeded!"))
