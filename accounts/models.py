from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver


class Role(models.TextChoices):
    ADMIN = 'ADMIN', 'Admin / Lead'
    TEAM_MEMBER = 'TEAM_MEMBER', 'Team Member'


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
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'User Profile'
        verbose_name_plural = 'User Profiles'

    def __str__(self):
        return f"{self.user.username} ({self.get_role_display()})"

    @property
    def is_admin(self) -> bool:
        return self.role == Role.ADMIN or self.user.is_superuser

    @property
    def is_team_member(self) -> bool:
        return self.role == Role.TEAM_MEMBER


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
