from django.db import models
from django.utils import timezone
from django.contrib.auth.models import User
from events.models import Event


class Photo(models.Model):
    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name='photos',
        db_index=True
    )
    uploaded_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='uploaded_photos',
        db_index=True
    )
    filename = models.CharField(max_length=255)
    storage_path = models.CharField(max_length=500, unique=True, db_index=True)
    file_size = models.PositiveIntegerField(help_text="File size in bytes")
    mime_type = models.CharField(max_length=100)
    width = models.PositiveIntegerField(null=True, blank=True)
    height = models.PositiveIntegerField(null=True, blank=True)
    uploaded_at = models.DateTimeField(default=timezone.now, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-uploaded_at', '-id']
        indexes = [
            models.Index(fields=['event', '-uploaded_at']),
            models.Index(fields=['uploaded_by', '-uploaded_at']),
        ]

    def __str__(self):
        return f"{self.filename} ({self.event.name}) by {self.uploaded_by.username}"
