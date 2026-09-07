from django.contrib import admin
from events.models import Event, EventMembership


class EventMembershipInline(admin.TabularInline):
    model = EventMembership
    extra = 1
    raw_id_fields = ('user',)


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ('name', 'event_date', 'location', 'created_by', 'created_at')
    list_filter = ('event_date', 'created_at')
    search_fields = ('name', 'location', 'created_by__username')
    inlines = [EventMembershipInline]


@admin.register(EventMembership)
class EventMembershipAdmin(admin.ModelAdmin):
    list_display = ('event', 'user', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('event__name', 'user__username')
