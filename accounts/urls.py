from django.urls import path, reverse_lazy
from django.contrib.auth import views as auth_views
from accounts import views

app_name = 'accounts'

urlpatterns = [
    # Core Authentication
    path('login/', views.login_view, name='login'),
    path('register/', views.register_view, name='register'),
    path('logout/', views.logout_view, name='logout'),
    path('session-expired/', views.session_expired_view, name='session_expired'),
    path('unauthorized/', views.unauthorized_view, name='unauthorized'),
    path('forbidden/', views.forbidden_view, name='forbidden'),

    # Invitation & Account Activation
    path('activate/', views.account_activation, name='account_activation'),

    # Password Reset Workflows (Django Auth Views with Custom Responsive Templates)
    path(
        'password-reset/',
        auth_views.PasswordResetView.as_view(
            template_name='accounts/password_reset_form.html',
            email_template_name='accounts/password_reset_email.html',
            subject_template_name='accounts/password_reset_subject.txt',
            success_url=reverse_lazy('accounts:password_reset_done'),
        ),
        name='password_reset'
    ),
    path(
        'password-reset/done/',
        auth_views.PasswordResetDoneView.as_view(
            template_name='accounts/password_reset_done.html'
        ),
        name='password_reset_done'
    ),
    path(
        'reset/<uidb64>/<token>/',
        auth_views.PasswordResetConfirmView.as_view(
            template_name='accounts/password_reset_confirm.html',
            success_url=reverse_lazy('accounts:password_reset_complete')
        ),
        name='password_reset_confirm'
    ),
    path(
        'reset/done/',
        auth_views.PasswordResetCompleteView.as_view(
            template_name='accounts/password_reset_complete.html'
        ),
        name='password_reset_complete'
    ),

    # Dashboards
    path('dashboard/', views.dashboard_router, name='dashboard_router'),
    path('dashboard/admin/', views.admin_dashboard, name='admin_dashboard'),
    path('dashboard/admin/<str:token>/', views.admin_dashboard, name='admin_dashboard_token'),
    path('dashboard/team/', views.team_dashboard, name='team_dashboard'),

    # Team Member Management Hub
    path('team/', views.team_management, name='team_management'),
    path('team/member/<int:member_id>/details/', views.team_member_details_api, name='team_member_details_api'),
    path('team/member/<int:member_id>/', views.team_member_detail_view, name='team_member_detail'),
    path('team/member/<int:member_id>/reset-password/', views.team_member_send_password_reset, name='team_member_send_password_reset'),
    path('team/member/<int:member_id>/sign-out-sessions/', views.team_member_sign_out_sessions, name='team_member_sign_out_sessions'),
    path('team/member/<int:member_id>/suspend/', views.team_member_suspend, name='team_member_suspend'),
    path('team/member/<int:member_id>/reactivate/', views.team_member_reactivate, name='team_member_reactivate'),
    path('team/member/<int:member_id>/remove/', views.team_member_remove, name='team_member_remove'),

    # Admin Account Management Hub
    path('administrators/', views.administrators_list, name='administrators_list'),
    path('administrators/<int:admin_id>/details/', views.administrator_details_api, name='administrator_details_api'),

    # User Profile & Security Settings
    path('profile/', views.my_profile_view, name='my_profile'),
    path('security/', views.security_settings_view, name='security_settings'),
    path('settings/', views.studio_settings, name='studio_settings'),
]
