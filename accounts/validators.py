import re
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _

WORKSPACE_KEYWORDS = [
    'trizen',
    'trizenai',
    'trizen_ai',
    'trizen-ai',
    'photo_sharing_platform',
    'photosharingplatform',
    'photo-sharing-platform',
    'photosharing',
]


def validate_strong_password(password: str, user=None, username: str = None, email: str = None):
    """
    Validates that a password satisfies all strong security constraints:
    1. Minimum 8 characters in length.
    2. Contains at least one uppercase letter (A-Z).
    3. Contains at least one lowercase letter (a-z).
    4. Contains at least one numeric digit (0-9).
    5. Contains at least one special character.
    6. Does not contain the user's ID/username.
    7. Does not contain the user's email or email local-part.
    8. Does not contain the workspace / company name.
    """
    if not password:
        raise ValidationError(_("Password cannot be empty."))

    errors = []

    # 1. Length check
    if len(password) < 8:
        errors.append(_("Password must be at least 8 characters long."))

    # 2. Uppercase letter check
    if not re.search(r'[A-Z]', password):
        errors.append(_("Password must contain at least one uppercase letter (A-Z)."))

    # 3. Lowercase letter check
    if not re.search(r'[a-z]', password):
        errors.append(_("Password must contain at least one lowercase letter (a-z)."))

    # 4. Number check
    if not re.search(r'[0-9]', password):
        errors.append(_("Password must contain at least one number (0-9)."))

    # 5. Special character check
    if not re.search(r'[^A-Za-z0-9]', password):
        errors.append(_("Password must contain at least one special character (e.g. !@#$%^&*)."))

    pw_lower = password.lower()

    # 6. Username / User ID check
    effective_username = username
    if not effective_username and user and hasattr(user, 'username'):
        effective_username = user.username

    if effective_username:
        u_clean = effective_username.strip().lower()
        if len(u_clean) >= 3 and u_clean in pw_lower:
            errors.append(_("Password cannot contain your username / user ID."))

    # 7. Email check
    effective_email = email
    if not effective_email and user and hasattr(user, 'email'):
        effective_email = user.email

    if effective_email:
        e_clean = effective_email.strip().lower()
        email_prefix = e_clean.split('@')[0] if '@' in e_clean else e_clean
        if len(email_prefix) >= 3 and email_prefix in pw_lower:
            errors.append(_("Password cannot contain your email address."))

    # 8. Workspace / Platform name check
    for keyword in WORKSPACE_KEYWORDS:
        if keyword in pw_lower:
            errors.append(_(
                f"Password cannot contain the workspace or platform name ('{keyword}')."
            ))
            break

    if errors:
        raise ValidationError(errors)


class StrongPasswordValidator:
    """
    Django standard password validator for settings.AUTH_PASSWORD_VALIDATORS.
    Enforces strong password rules, disallowing user ID, email, and workspace name.
    """

    def validate(self, password, user=None):
        validate_strong_password(password, user=user)

    def get_help_text(self):
        return _(
            "Your password must be at least 8 characters long, include uppercase and "
            "lowercase letters, numbers, and special characters. It cannot contain your "
            "username, email address, or the workspace name."
        )
