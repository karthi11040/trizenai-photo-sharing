import os
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from accounts.models import Profile, Role, MemberStatus


class Command(BaseCommand):
    help = "Ensures an initial Administrator superuser exists without seeding sample data."

    def handle(self, *args, **options):
        username = os.getenv("DJANGO_SUPERUSER_USERNAME", "es_studios").strip() or "es_studios"
        email = os.getenv("DJANGO_SUPERUSER_EMAIL", "admin@trizenai.studio").strip() or "admin@trizenai.studio"
        password = os.getenv("DJANGO_SUPERUSER_PASSWORD", "AdminPassword2026!").strip() or "AdminPassword2026!"

        user = User.objects.filter(username=username).first()
        if not user:
            user = User.objects.filter(email=email).first()

        if not user:
            user = User.objects.create_superuser(
                username=username,
                email=email,
                password=password,
                first_name="Studio",
                last_name="Lead"
            )
            self.stdout.write(self.style.SUCCESS(f"✓ Created initial Administrator superuser: {username} ({email})"))
        else:
            user.is_staff = True
            user.is_superuser = True
            user.save()
            self.stdout.write(self.style.SUCCESS(f"✓ Verified Administrator superuser exists: {user.username} ({user.email})"))

        profile, _ = Profile.objects.get_or_create(user=user)
        profile.role = Role.ADMIN
        profile.status = MemberStatus.ACTIVE
        if not profile.studio_name:
            profile.studio_name = "TrizenAI Studio"
        profile.save()
