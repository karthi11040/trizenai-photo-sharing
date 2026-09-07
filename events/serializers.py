from rest_framework import serializers
from django.contrib.auth.models import User
from events.models import Event, EventMembership


class EventMemberSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    role = serializers.CharField(source='user.profile.role', read_only=True)

    class Meta:
        model = EventMembership
        fields = ['id', 'user_id', 'username', 'email', 'role', 'created_at']


class AddMemberSerializer(serializers.Serializer):
    user_id = serializers.IntegerField(required=True)


class EventSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    members_count = serializers.IntegerField(source='memberships.count', read_only=True)

    class Meta:
        model = Event
        fields = [
            'id',
            'name',
            'description',
            'event_date',
            'location',
            'created_by',
            'created_by_username',
            'members_count',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']
