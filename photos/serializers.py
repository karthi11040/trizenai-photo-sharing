from rest_framework import serializers
from photos.models import Photo
from photos.storage import StorageService


class PhotoSerializer(serializers.ModelSerializer):
    uploaded_by_username = serializers.CharField(source='uploaded_by.username', read_only=True)
    signed_url = serializers.SerializerMethodField()

    class Meta:
        model = Photo
        fields = [
            'id',
            'event',
            'uploaded_by',
            'uploaded_by_username',
            'filename',
            'storage_path',
            'file_size',
            'mime_type',
            'width',
            'height',
            'signed_url',
            'uploaded_at',
            'updated_at',
            'created_at'
        ]
        read_only_fields = [
            'id',
            'event',
            'uploaded_by',
            'storage_path',
            'file_size',
            'mime_type',
            'width',
            'height',
            'uploaded_at',
            'updated_at',
            'created_at'
        ]

    def get_signed_url(self, obj: Photo) -> str:
        return StorageService.create_signed_url(obj.storage_path, expires_in=3600)
