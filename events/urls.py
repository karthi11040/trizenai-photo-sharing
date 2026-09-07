from django.urls import path
from events import views

app_name = 'events'

urlpatterns = [
    path('', views.event_list, name='event_list'),
    path('assigned/', views.assigned_events, name='assigned_events'),
]
