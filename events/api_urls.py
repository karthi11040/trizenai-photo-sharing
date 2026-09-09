from django.urls import path
from events import api_views
from photos import api_views as photo_api_views

urlpatterns = [
    path('', api_views.EventListCreateAPIView.as_view(), name='api_event_list_create'),
    path('<int:id>/', api_views.EventDetailAPIView.as_view(), name='api_event_detail'),
    path('<int:id>/members/', api_views.EventMembersAPIView.as_view(), name='api_event_members'),
    path('<int:id>/members/<int:user_id>/', api_views.EventMemberDetailAPIView.as_view(), name='api_event_member_delete'),
    path('<int:id>/photos/', photo_api_views.EventPhotoListUploadAPIView.as_view(), name='api_event_photos'),
    path('<int:id>/photos/upload/', photo_api_views.EventPhotoListUploadAPIView.as_view(), name='api_event_photos_upload'),
]
