from django.urls import path
from photos import views

app_name = 'photos'

urlpatterns = [
    path('', views.photo_review_hub, name='photo_review_hub'),
    path('review/', views.photo_review_hub, name='review_hub'),
    path('event/<int:event_id>/', views.event_photos, name='event_photos'),
    path('event/<int:event_id>/live/', views.live_photos, name='live_photos'),
    path('event/<int:event_id>/select/<int:photo_id>/', views.toggle_photo_select, name='toggle_photo_select'),
    path('event/<int:event_id>/select-all/', views.select_all_photos, name='select_all_photos'),
    path('event/<int:event_id>/clear-selection/', views.clear_photo_selection, name='clear_photo_selection'),
    path('event/<int:event_id>/upload/', views.upload_photos, name='upload_photos'),
    path('event/<int:event_id>/upload/direct/', views.upload_photos, name='event_upload'),
    path('<int:photo_id>/delete/', views.delete_photo, name='delete_photo'),
    path('mock-stream/<path:storage_path>', views.mock_stream, name='mock_stream'),
]

