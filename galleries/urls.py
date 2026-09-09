from django.urls import path
from galleries import views

app_name = 'galleries'

urlpatterns = [
    path('', views.gallery_list, name='gallery_list'),
    path('live-stats/', views.live_gallery_stats, name='live_gallery_stats'),
    path('create/', views.gallery_create, name='gallery_create_default'),
    path('create/<int:event_id>/', views.gallery_create, name='gallery_create'),
    path('<int:gallery_id>/publish/', views.gallery_publish, name='gallery_publish'),
    path('<slug:slug>/', views.customer_gallery_router, name='customer_gallery_router'),
    path('<slug:slug>/verify/', views.customer_gallery_verify_pin, name='customer_gallery_verify_pin'),
    path('<slug:slug>/<str:session_token>/', views.customer_gallery_view, name='customer_gallery_view'),
]
