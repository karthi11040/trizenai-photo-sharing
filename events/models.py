from django.db import models
from django.contrib.auth.models import User


class Event(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    event_date = models.DateField(db_index=True)
    location = models.CharField(max_length=255, blank=True, default='')
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

    def is_member(self, user: User) -> bool:
        if not user or not user.is_authenticated:
            return False
        return self.memberships.filter(user=user).exists()


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
