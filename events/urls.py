from django.urls import path
from events import views

app_name = 'events'

urlpatterns = [
    path('', views.event_list, name='event_list'),
    path('assigned/', views.assigned_events, name='assigned_events'),
    path('create/', views.event_create, name='event_create'),
    path('<int:event_id>/', views.event_detail, name='event_detail'),
    path('<int:event_id>/edit/', views.event_update, name='event_update'),
    path('<int:event_id>/delete/', views.event_delete, name='event_delete'),
    path('<int:event_id>/members/add/', views.add_member, name='add_member'),
    path('<int:event_id>/members/<int:user_id>/remove/', views.remove_member, name='remove_member'),
]
