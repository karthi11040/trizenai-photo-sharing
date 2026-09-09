from django.contrib import admin
from photos.models import Photo


@admin.register(Photo)
class PhotoAdmin(admin.ModelAdmin):
    list_display = ('filename', 'event', 'uploaded_by', 'file_size', 'mime_type', 'created_at')
    list_filter = ('event', 'mime_type', 'created_at')
    search_fields = ('filename', 'storage_path', 'uploaded_by__username', 'event__name')
    readonly_fields = ('created_at', 'storage_path', 'file_size', 'mime_type', 'width', 'height')
