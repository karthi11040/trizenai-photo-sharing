from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver


class Role(models.TextChoices):
    ADMIN = 'ADMIN', 'Admin / Lead'
    TEAM_MEMBER = 'TEAM_MEMBER', 'Team Member'


class MemberStatus(models.TextChoices):
    ACTIVE = 'ACTIVE', 'Active'
    PENDING = 'PENDING', 'Pending'
    SUSPENDED = 'SUSPENDED', 'Suspended'


import secrets


def generate_dashboard_token():
    return secrets.token_urlsafe(16)


class Profile(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='profile'
    )
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.TEAM_MEMBER,
        db_index=True
    )
    status = models.CharField(
        max_length=20,
        choices=MemberStatus.choices,
        default=MemberStatus.ACTIVE,
        db_index=True
    )
    phone_number = models.CharField(
        max_length=30,
        blank=True,
        default=''
    )
    studio_name = models.CharField(
        max_length=150,
        blank=True,
        default='',
        help_text="Custom studio brand name displayed in live client galleries and customer portals."
    )
    studio_logo = models.ImageField(
        upload_to='studio_logos/',
        blank=True,
        null=True,
        help_text="Custom studio logo image displayed in settings and live client galleries."
    )
    dashboard_token = models.CharField(
        max_length=64,
        blank=True,
        default=generate_dashboard_token,
        db_index=True
    )
    invitation_sent_at = models.DateTimeField(
        null=True,
        blank=True
    )
    is_email_verified = models.BooleanField(
        default=True,
        help_text="Whether the user's email address has been verified via Supabase or admin onboarding."
    )
    login_count = models.PositiveIntegerField(
        default=0,
        help_text="Total number of successful logins to this account."
    )
    last_password_change = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp of the most recent password update or reset."
    )
    last_login_device = models.CharField(
        max_length=120,
        blank=True,
        default='Chrome on Windows'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'User Profile'
        verbose_name_plural = 'User Profiles'

    def __str__(self):
        return f"{self.user.username} ({self.get_role_display()} - {self.get_status_display()})"

    @property
    def is_admin(self) -> bool:
        return self.role == Role.ADMIN or self.user.is_superuser

    @property
    def is_team_member(self) -> bool:
        return self.role == Role.TEAM_MEMBER

    @property
    def is_active_member(self) -> bool:
        return self.status == MemberStatus.ACTIVE

    @property
    def is_pending(self) -> bool:
        return self.status == MemberStatus.PENDING

    @property
    def is_suspended(self) -> bool:
        return self.status == MemberStatus.SUSPENDED

    @property
    def studio_logo_url(self) -> str:
        if self.studio_logo:
            try:
                return self.studio_logo.url
            except Exception:
                return ''
        return ''


@receiver(post_save, sender=User)
def create_or_update_user_profile(sender, instance, created, **kwargs):
    """
    Ensure every User has an associated Profile.
    Superusers automatically receive the ADMIN role.
    Standard newly created users receive TEAM_MEMBER by default.
    """
    if created:
        initial_role = Role.ADMIN if instance.is_superuser else Role.TEAM_MEMBER
        Profile.objects.create(user=instance, role=initial_role)
    else:
        # If user was promoted to superuser, ensure profile reflects ADMIN role
        if hasattr(instance, 'profile'):
            if instance.is_superuser and instance.profile.role != Role.ADMIN:
                instance.profile.role = Role.ADMIN
                instance.profile.save()
        else:
            initial_role = Role.ADMIN if instance.is_superuser else Role.TEAM_MEMBER
            Profile.objects.create(user=instance, role=initial_role)
