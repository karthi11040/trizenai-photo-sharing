web: sh -c "python manage.py migrate --no-input && python manage.py ensure_admin && gunicorn config.wsgi:application"
