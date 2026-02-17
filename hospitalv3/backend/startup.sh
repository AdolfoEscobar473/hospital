#!/bin/bash
# Startup para Azure App Service (Linux). El puerto lo define Azure en PORT.
set -e
python manage.py collectstatic --noinput --clear 2>/dev/null || true
exec gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 2 --threads 2 --timeout 60
