import logging
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes

logger = logging.getLogger(__name__)


def send_team_invitation_email(user, invite_link, invited_by=None, assigned_events_count=0):
    """
    Sends an HTML invitation email to a newly invited or resent Team Member via configured SMTP.
    """
    if not user.email:
        logger.warning("Cannot send team invitation: User %s has no email address.", user.username)
        return False

    recipient_name = user.get_full_name() or user.username
    sender_name = (invited_by.get_full_name() or invited_by.username) if invited_by else "Studio Lead"
    subject = "You're invited to join TrizenAI Studio as a Team Member"

    text_content = f"""Hello {recipient_name},

You have been invited by {sender_name} to join the TrizenAI Studio Workspace as a Team Member.

To activate your account and access your assigned photography events, please click the link below:
{invite_link}

Assigned Events: {assigned_events_count} event(s)
Role: Team Member (Photographer / Shooter)

This secure one-time activation link expires in 7 days.

Best regards,
TrizenAI Studio Team
"""

    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TrizenAI Studio Invitation</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; color: #1e293b; }}
    .container {{ max-width: 580px; margin: 30px auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }}
    .header {{ background: #0f172a; padding: 28px; text-align: center; color: #ffffff; }}
    .logo-text {{ font-size: 22px; font-weight: 700; letter-spacing: -0.5px; margin: 0; color: #ffffff; }}
    .content {{ padding: 32px 28px; line-height: 1.6; font-size: 15px; }}
    .btn {{ display: inline-block; background-color: #3b82f6; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 600; font-size: 15px; margin: 24px 0; }}
    .card {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin: 20px 0; font-size: 14px; }}
    .footer {{ background: #f1f5f9; padding: 20px 28px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 class="logo-text">TrizenAI Studio</h2>
      <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 13px;">Professional Event Photography Platform</p>
    </div>
    <div class="content">
      <h3 style="margin-top: 0; color: #0f172a; font-size: 20px;">Welcome, {recipient_name}!</h3>
      <p><strong>{sender_name}</strong> has invited you to collaborate on the <strong>Studio Alpha</strong> workspace.</p>
      
      <div class="card">
        <div style="margin-bottom: 6px;"><strong>Role:</strong> <span style="background: #eff6ff; color: #1d4ed8; padding: 2px 8px; border-radius: 6px; font-size: 12px; font-weight: 600;">TEAM MEMBER</span></div>
        <div style="margin-bottom: 6px;"><strong>Assigned Events:</strong> {assigned_events_count} event(s)</div>
        <div><strong>Workspace:</strong> Studio Alpha</div>
      </div>

      <div style="text-align: center;">
        <a href="{invite_link}" class="btn" target="_blank">Activate Account &amp; Access Events</a>
      </div>

      <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
        If the button above does not work, copy and paste this link into your browser:<br>
        <a href="{invite_link}" style="color: #3b82f6; word-break: break-all;">{invite_link}</a>
      </p>
      <p style="font-size: 12px; color: #94a3b8;">This secure one-time activation link expires in 7 days.</p>
    </div>
    <div class="footer">
      &copy; 2026 TrizenAI Studio &bull; Event Photography Platform
    </div>
  </div>
</body>
</html>"""

    try:
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'TrizenAI Studio <noreply@trizenai.com>')
        host_user = getattr(settings, 'EMAIL_HOST_USER', '')
        reply_to_list = [host_user] if host_user else None
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=from_email,
            to=[user.email],
            reply_to=reply_to_list
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=False)
        logger.info("Successfully sent team invitation email to %s (%s)", user.username, user.email)
        return True
    except Exception as e:
        logger.error("Failed to send team invitation email to %s: %s", user.email, e)
        return False


def send_admin_invitation_email(user, invite_link, invited_by=None):
    """
    Sends an HTML invitation email to an invited Administrator.
    """
    if not user.email:
        logger.warning("Cannot send admin invitation: User %s has no email address.", user.username)
        return False

    recipient_name = user.get_full_name() or user.username
    sender_name = (invited_by.get_full_name() or invited_by.username) if invited_by else "Studio Lead"
    subject = "You're invited to join TrizenAI Studio as an Administrator"

    text_content = f"""Hello {recipient_name},

You have been invited by {sender_name} to join the TrizenAI Studio Workspace as an Administrator.

To activate your account and configure your administrative credentials, please click the link below:
{invite_link}

Role: Administrator (Full Workspace Privileges)

This secure one-time activation link expires in 7 days.

Best regards,
TrizenAI Studio Team
"""

    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TrizenAI Studio Administrator Invitation</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; color: #1e293b; }}
    .container {{ max-width: 580px; margin: 30px auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }}
    .header {{ background: #0f172a; padding: 28px; text-align: center; color: #ffffff; }}
    .logo-text {{ font-size: 22px; font-weight: 700; letter-spacing: -0.5px; margin: 0; color: #ffffff; }}
    .content {{ padding: 32px 28px; line-height: 1.6; font-size: 15px; }}
    .btn {{ display: inline-block; background-color: #0f172a; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 600; font-size: 15px; margin: 24px 0; }}
    .card {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin: 20px 0; font-size: 14px; }}
    .footer {{ background: #f1f5f9; padding: 20px 28px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 class="logo-text">TrizenAI Studio</h2>
      <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 13px;">Administrator Access Portal</p>
    </div>
    <div class="content">
      <h3 style="margin-top: 0; color: #0f172a; font-size: 20px;">Administrator Access Granted</h3>
      <p><strong>{sender_name}</strong> has invited you to join the <strong>Studio Alpha</strong> workspace as an <strong>Administrator</strong>.</p>
      
      <div class="card">
        <div style="margin-bottom: 6px;"><strong>Role:</strong> <span style="background: #0f172a; color: #ffffff; padding: 2px 8px; border-radius: 6px; font-size: 12px; font-weight: 600;">ADMINISTRATOR</span></div>
        <div><strong>Privileges:</strong> Event Management, Team Management, Gallery Publishing</div>
      </div>

      <div style="text-align: center;">
        <a href="{invite_link}" class="btn" target="_blank">Activate Admin Account</a>
      </div>

      <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
        Direct link:<br>
        <a href="{invite_link}" style="color: #3b82f6; word-break: break-all;">{invite_link}</a>
      </p>
      <p style="font-size: 12px; color: #94a3b8;">This secure one-time activation link expires in 7 days.</p>
    </div>
    <div class="footer">
      &copy; 2026 TrizenAI Studio &bull; Event Photography Platform
    </div>
  </div>
</body>
</html>"""

    try:
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'TrizenAI Studio <noreply@trizenai.com>')
        host_user = getattr(settings, 'EMAIL_HOST_USER', '')
        reply_to_list = [host_user] if host_user else None
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=from_email,
            to=[user.email],
            reply_to=reply_to_list
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=False)
        logger.info("Successfully sent admin invitation email to %s (%s)", user.username, user.email)
        return True
    except Exception as e:
        logger.error("Failed to send admin invitation email to %s: %s", user.email, e)
        return False


def send_member_password_reset_email(user, request):
    """
    Sends a secure password reset link to a member via configured SMTP.
    """
    if not user.email:
        logger.warning("Cannot send password reset: User %s has no email address.", user.username)
        return False

    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    reset_link = request.build_absolute_uri(f"/accounts/reset/{uid}/{token}/")

    recipient_name = user.get_full_name() or user.username
    subject = "Password Reset Request — TrizenAI Studio"

    text_content = f"""Hello {recipient_name},

A password reset was requested for your TrizenAI Studio workspace account ({user.username}).

To reset your password, please click the link below:
{reset_link}

If you did not request this change, you can safely ignore this email.

Best regards,
TrizenAI Studio Security Team
"""

    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; color: #1e293b; }}
    .container {{ max-width: 580px; margin: 30px auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }}
    .header {{ background: #0f172a; padding: 28px; text-align: center; color: #ffffff; }}
    .logo-text {{ font-size: 22px; font-weight: 700; letter-spacing: -0.5px; margin: 0; color: #ffffff; }}
    .content {{ padding: 32px 28px; line-height: 1.6; font-size: 15px; }}
    .btn {{ display: inline-block; background-color: #3b82f6; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 600; font-size: 15px; margin: 24px 0; }}
    .footer {{ background: #f1f5f9; padding: 20px 28px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 class="logo-text">TrizenAI Studio</h2>
      <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 13px;">Security &amp; Account Protection</p>
    </div>
    <div class="content">
      <h3 style="margin-top: 0; color: #0f172a; font-size: 20px;">Password Reset Request</h3>
      <p>Hello <strong>{recipient_name}</strong>,</p>
      <p>A password reset was requested for your TrizenAI Studio account associated with <strong>{user.email}</strong>.</p>
      
      <div style="text-align: center;">
        <a href="{reset_link}" class="btn" target="_blank">Reset Your Password</a>
      </div>

      <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
        Direct reset link:<br>
        <a href="{reset_link}" style="color: #3b82f6; word-break: break-all;">{reset_link}</a>
      </p>
      <p style="font-size: 12px; color: #94a3b8;">If you did not request this password reset, no action is needed.</p>
    </div>
    <div class="footer">
      &copy; 2026 TrizenAI Studio &bull; Event Photography Platform
    </div>
  </div>
</body>
</html>"""

    try:
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'TrizenAI Studio <noreply@trizenai.com>')
        host_user = getattr(settings, 'EMAIL_HOST_USER', '')
        reply_to_list = [host_user] if host_user else None
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=from_email,
            to=[user.email],
            reply_to=reply_to_list
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=False)
        logger.info("Successfully sent password reset email to %s (%s)", user.username, user.email)
        return True
    except Exception as e:
        logger.error("Failed to send password reset email to %s: %s", user.email, e)
        return False
