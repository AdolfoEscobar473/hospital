#!/usr/bin/env python
"""Script para reproducir el 500 en POST /api/documents/"""
import os
import sys
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
os.environ["USE_SQLITE"] = "true"
django.setup()

from django.test import Client
from django.core.files.uploadedfile import SimpleUploadedFile
from accounts.models import User

# Obtener token de un usuario
user = User.objects.filter(username="admin").first()
if not user:
    print("No hay usuario admin. Ejecuta: python manage.py seed_initial_data")
    sys.exit(1)

from rest_framework_simplejwt.tokens import RefreshToken
refresh = RefreshToken.for_user(user)
access = str(refresh.access_token)

client = Client()
f = SimpleUploadedFile("test.txt", b"contenido de prueba", content_type="text/plain")
data = {
    "file": f,
    "processId": "",
    "type": "",
    "status": "vigente",
    "version": "1.0",
    "visibility": "institutional",
}
resp = client.post(
    "/api/documents/",
    data=data,
    HTTP_AUTHORIZATION=f"Bearer {access}",
    format="multipart",
)
print("Status:", resp.status_code)
print("Content-Type:", resp.get("Content-Type"))
print("Body:", resp.content.decode()[:500] if resp.content else "")
