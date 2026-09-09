"""
Django settings for TrizenAI Photo Sharing Platform.
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
import dj_database_url

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from .env file
load_dotenv(BASE_DIR / '.env')

# Quick-start development settings - unsuitable for production
SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-dev-fallback-key-2026')

DEBUG = os.getenv('DEBUG', 'False').lower() in ('true', '1', 't', 'yes')

ALLOWED_HOSTS = [h.strip() for h in os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1,.onrender.com,testserver').split(',') if h.strip()]
if 'testserver' not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append('testserver')

# CSRF Trusted Origins for Render and local development
CSRF_TRUSTED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        'CSRF_TRUSTED_ORIGINS',
        'http://localhost:8000,http://127.0.0.1:8000,https://*.onrender.com'
    ).split(',')
    if origin.strip()
]

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'whitenoise.runserver_nostatic',
    'django.contrib.staticfiles',

    # Third-Party Apps
    'rest_framework',

    # Local Domain Apps
    'accounts.apps.AccountsConfig',
    'events.apps.EventsConfig',
    'photos.apps.PhotosConfig',
    'galleries.apps.GalleriesConfig',
]

MIDDLEWARE = [
    'config.middleware.RequestIDMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'config.middleware.ProductionSecurityHeadersMiddleware',
    'config.middleware.RateLimitMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

# Database Configuration Strategy (PostgreSQL primary / explicit SQLite local fallback)
DATABASE_ENGINE = os.getenv('DATABASE_ENGINE', '').lower()
DATABASE_URL = os.getenv('DATABASE_URL', '').strip()

if DATABASE_ENGINE == 'sqlite' or (not DATABASE_URL and DEBUG):
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
elif DATABASE_URL:
    DATABASES = {
        'default': dj_database_url.parse(
            DATABASE_URL,
            conn_max_age=600,
            conn_health_checks=True,
        )
    }
else:
    raise ValueError(
        "DATABASE_URL must be configured for PostgreSQL database connection in production, "
        "or explicitly specify DATABASE_ENGINE=sqlite in development."
    )

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {'min_length': 8},
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
    {
        'NAME': 'accounts.validators.StrongPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [BASE_DIR / 'static']

STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage" if not DEBUG else "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Authentication redirects
LOGIN_URL = 'accounts:login'
LOGIN_REDIRECT_URL = 'accounts:dashboard_router'
LOGOUT_REDIRECT_URL = 'accounts:login'

# Supabase Storage Configuration (Server-Side Only - Private Object Storage)
SUPABASE_URL = os.getenv('SUPABASE_URL', '').rstrip('/')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_SECRET_KEY', '')
SUPABASE_STORAGE_BUCKET = os.getenv('SUPABASE_STORAGE_BUCKET', 'event-photos')
SUPABASE_PUBLISHABLE_KEY = (
    os.getenv('SUPABASE_PUBLISHABLE_KEY') or
    os.getenv('SUPABASE_ANON_KEY') or
    os.getenv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', '')
)
SUPABASE_ANON_KEY = SUPABASE_PUBLISHABLE_KEY

# Unrestricted Large File & Multi-Photo Batch Upload Settings (N images, N sizes)
DATA_UPLOAD_MAX_MEMORY_SIZE = 1024 * 1024 * 1024 * 5  # 5 GB max upload request body
FILE_UPLOAD_MAX_MEMORY_SIZE = 1024 * 1024 * 200  # 200 MB in-memory buffer before streaming to temp disk
DATA_UPLOAD_MAX_NUMBER_FIELDS = 100000
DATA_UPLOAD_MAX_NUMBER_FILES = 10000  # Support N arbitrary number of batch images

# Django REST Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'EXCEPTION_HANDLER': 'config.exceptions.custom_exception_handler',
}

# Security and Session Persistence Hardening (Stay logged in until explicit logout)
SESSION_ENGINE = 'django.contrib.sessions.backends.db'
SESSION_EXPIRE_AT_BROWSER_CLOSE = False
SESSION_COOKIE_AGE = 60 * 60 * 24 * 30  # 30 days default persistent session
SESSION_SAVE_EVERY_REQUEST = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_HTTPONLY = False
CSRF_COOKIE_SAMESITE = 'Lax'
# Email Configuration (SMTP)
if 'test' in sys.argv:
    EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
    PASSWORD_HASHERS = ['django.contrib.auth.hashers.MD5PasswordHasher']
else:
    EMAIL_BACKEND = os.getenv('EMAIL_BACKEND', 'django.core.mail.backends.smtp.EmailBackend')
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', 587))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True').lower() in ('true', '1', 't')
EMAIL_USE_SSL = os.getenv('EMAIL_USE_SSL', 'False').lower() in ('true', '1', 't')
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '').replace(' ', '')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', f"TrizenAI Studio <{EMAIL_HOST_USER}>" if EMAIL_HOST_USER else "TrizenAI Studio <noreply@trizenai.com>")
SERVER_EMAIL = DEFAULT_FROM_EMAIL

if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'
    SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
else:
    SESSION_COOKIE_SECURE = False
    CSRF_COOKIE_SECURE = False
    X_FRAME_OPTIONS = 'DENY'

# Operational Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '[{asctime}] {levelname} {name} {module}:{lineno}: {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO' if not DEBUG else 'DEBUG',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'accounts': {
            'handlers': ['console'],
            'level': 'INFO' if not DEBUG else 'DEBUG',
            'propagate': False,
        },
        'events': {
            'handlers': ['console'],
            'level': 'INFO' if not DEBUG else 'DEBUG',
            'propagate': False,
        },
        'photos': {
            'handlers': ['console'],
            'level': 'INFO' if not DEBUG else 'DEBUG',
            'propagate': False,
        },
        'galleries': {
            'handlers': ['console'],
            'level': 'INFO' if not DEBUG else 'DEBUG',
            'propagate': False,
        },
    },
}
