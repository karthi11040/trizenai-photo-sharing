from django.urls import path
from photos import api_views

urlpatterns = [
    path('<int:id>/', api_views.PhotoDetailAPIView.as_view(), name='api_photo_detail'),
]
