from django.db import models
from django.contrib.auth.models import User


class Event(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    event_date = models.DateField(db_index=True)
    location = models.CharField(max_length=255, blank=True, default='')
    cover_image = models.ImageField(upload_to='event_covers/', blank=True, null=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='created_events',
        db_index=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-event_date', '-created_at']
        indexes = [
            models.Index(fields=['created_by', 'event_date']),
        ]

    def __str__(self):
        return f"{self.name} ({self.event_date})"

    @property
    def storage_folder_name(self) -> str:
        """Returns clean, human-readable, valid folder name for Supabase storage."""
        from django.utils.text import slugify
        slug = slugify(self.name) or "event"
        return f"{self.id}_{slug}"

    def is_member(self, user: User) -> bool:
        if not user or not user.is_authenticated:
            return False
        return self.memberships.filter(user=user).exists()

    def get_thumbnail_url(self) -> str | None:
        """
        Safely returns thumbnail URL for event:
        1. cover_image URL if validly uploaded.
        2. First valid photo's signed URL from event photos.
        3. None fallback.
        """
        if self.cover_image:
            try:
                return self.cover_image.url
            except (ValueError, Exception):
                pass

        for p in self.photos.all()[:10]:
            try:
                from photos.storage import StorageService
                url = StorageService.create_signed_url(p.storage_path, expires_in=3600)
                if url:
                    return url
            except Exception:
                pass
        return None



class EventMembership(models.Model):
    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name='memberships',
        db_index=True
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='event_memberships',
        db_index=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['event', 'user'],
                name='unique_event_user_membership'
            )
        ]
        indexes = [
            models.Index(fields=['event', 'user']),
        ]

    def __str__(self):
        return f"{self.user.username} -> {self.event.name}"
