web: sh -c "python manage.py migrate --no-input && python manage.py ensure_admin && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT"
