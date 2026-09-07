"""
URL configuration for TrizenAI Photo Sharing Platform.
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from config.views import health_check, home

urlpatterns = [
    path('admin/', admin.site.urls),
    path('health/', health_check, name='health_check'),
    path('', home, name='home'),

    # Modular Applications
    path('accounts/', include('accounts.urls', namespace='accounts')),
    path('events/', include('events.urls', namespace='events')),
    path('photos/', include('photos.urls', namespace='photos')),
    path('gallery/', include('galleries.urls', namespace='galleries')),

    # REST APIs
    path('api/auth/', include(('accounts.api_urls', 'accounts_api'), namespace='api_auth')),
    path('api/events/', include(('events.api_urls', 'events_api'), namespace='api_events')),
    path('api/photos/', include(('photos.api_urls', 'photos_api'), namespace='api_photos')),
    path('api/galleries/', include(('galleries.api_urls', 'galleries_api'), namespace='api_galleries')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
