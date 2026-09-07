from django.urls import path
from accounts import api_views

urlpatterns = [
    path('login/', api_views.APILoginView.as_view(), name='api_login'),
    path('logout/', api_views.APILogoutView.as_view(), name='api_logout'),
    path('me/', api_views.APIMeView.as_view(), name='api_me'),
]
