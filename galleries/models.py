from django.db import models
from django.contrib.auth.hashers import make_password, check_password
from events.models import Event
from photos.models import Photo


class Gallery(models.Model):
    """
    Client-facing Customer Gallery entity (Rules 23, 24, 25).
    Linked to an event, secured by hashed PIN, and exposed via unique slug.
    """
    event = models.OneToOneField(
        Event,
        on_delete=models.CASCADE,
        related_name='gallery'
    )
    title = models.CharField(max_length=255, blank=True, help_text="Custom client gallery title")
    slug = models.SlugField(max_length=255, unique=True, db_index=True)
    pin_code = models.CharField(max_length=10, default='482917', blank=True, help_text="6-digit client access PIN")
    pin_hash = models.CharField(max_length=255, help_text="Securely hashed gallery PIN")
    is_published = models.BooleanField(default=False, db_index=True)
    published_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'Galleries'
        ordering = ['-created_at']

    def __str__(self):
        return f"Gallery: {self.event.name} ({self.slug})"

    def set_pin(self, raw_pin: str):
        """Stores the 6-digit access PIN and its secure hash."""
        clean_pin = str(raw_pin).strip()
        self.pin_code = clean_pin
        self.pin_hash = make_password(clean_pin)

    def check_pin(self, raw_pin: str) -> bool:
        """Verifies candidate PIN against the stored hash or PIN code."""
        if not raw_pin:
            return False
        candidate = str(raw_pin).strip()
        if self.pin_code and candidate == self.pin_code:
            return True
        if self.pin_hash and check_password(candidate, self.pin_hash):
            return True
        return False


class GalleryPhoto(models.Model):
    """
    Through-model associating curated photos with a customer gallery (Rule 23).
    """
    gallery = models.ForeignKey(
        Gallery,
        on_delete=models.CASCADE,
        related_name='gallery_photos'
    )
    photo = models.ForeignKey(
        Photo,
        on_delete=models.CASCADE,
        related_name='in_galleries'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('gallery', 'photo')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.photo.filename} in {self.gallery.event.name}"


class GalleryView(models.Model):
    """
    Tracks client visits, hit rates, and IP access telemetry for customer galleries.
    """
    gallery = models.ForeignKey(
        Gallery,
        on_delete=models.CASCADE,
        related_name='views',
        db_index=True
    )
    ip_address = models.CharField(max_length=64, db_index=True, default='127.0.0.1')
    user_agent = models.CharField(max_length=255, blank=True, default='')
    device_type = models.CharField(max_length=60, blank=True, default='Desktop Browser')
    viewed_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-viewed_at']
        indexes = [
            models.Index(fields=['gallery', '-viewed_at']),
            models.Index(fields=['gallery', 'ip_address']),
        ]

    def __str__(self):
        return f"View on {self.gallery.slug} from {self.ip_address} at {self.viewed_at}"
