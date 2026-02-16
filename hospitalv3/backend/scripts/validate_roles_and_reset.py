#!/usr/bin/env python
"""
Valida sesión con usuario de rol bajo (reader), permisos por endpoint de Config
y flujo de restablecer contraseña. Ejecutar desde la raíz del backend:
  python scripts/validate_roles_and_reset.py
Requiere: usuario reader_test creado (python manage.py seed_reader_user)
          usuario admin (python manage.py seed_initial_data)
"""
import os
import sys

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django
django.setup()

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()

READER_USER = "reader_test"
READER_PASS = "Test123!"
ADMIN_USER = "admin"
ADMIN_PASS = "admin123"


def login(client, username, password):
    r = client.post("/api/auth/login", {"username": username, "password": password}, format="json")
    if r.status_code != 200:
        return False, r
    try:
        data = r.json()
        token = data.get("accessToken")
        if token:
            client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    except Exception:
        pass
    return True, r


def main():
    client = APIClient()
    print("=== Validación de roles y restablecer contraseña ===\n")

    # 1. Login como reader
    ok, res = login(client, READER_USER, READER_PASS)
    if not ok:
        try:
            data = getattr(res, "data", None) or res.json()
        except Exception:
            data = getattr(res, "content", b"").decode("utf-8", errors="replace")[:200]
        print(f"[FALLO] Login como {READER_USER}: {res.status_code} - {data}")
        print("  Ejecuta: python manage.py seed_reader_user")
        return 1
    print(f"[OK] Login como {READER_USER} (rol reader)")

    # 2. Endpoints de Config: reader 403 solo en /users/, 200 en el resto (404 aceptable donde aplique)
    checks = [
        ("GET /users/ (solo admin/leader)", "/api/users/", 403),
        ("GET /roles/", "/api/roles/", 200),
        ("GET /config/smtp", "/api/config/smtp", 200),
        ("GET /config/oauth", "/api/config/oauth", 200),
        ("GET /config/storage", "/api/config/storage", 200),
        ("GET /config/permissions-bulk", "/api/config/permissions-bulk", 200),
        ("GET /catalogs/", "/api/catalogs/", 200),
        ("GET /logs/", "/api/logs/", 200),
        ("GET /email-logs/", "/api/email-logs/", 200),
        ("GET /column-settings/documentos/", "/api/column-settings/documentos/", (200, 404)),
    ]
    for label, path, expected in checks:
        r = client.get(path)
        ok_status = r.status_code in expected if isinstance(expected, (list, tuple)) else r.status_code == expected
        if not ok_status:
            print(f"[FALLO] {label}: esperado {expected}, obtuvo {r.status_code}")
        else:
            print(f"[OK] {label}: {r.status_code}")

    # Reader no debe poder crear usuario ni PUT config
    r = client.post("/api/users/", {"username": "x", "password": "x", "name": "x", "roles": ["reader"]}, format="json")
    if r.status_code != 403:
        print(f"[FALLO] POST /users/ como reader: esperado 403, obtuvo {r.status_code}")
    else:
        print(f"[OK] POST /users/ (reader): 403")

    client.credentials()  # quitar token

    # 3. Login como admin y restablecer contraseña del reader
    ok, res = login(client, ADMIN_USER, ADMIN_PASS)
    if not ok:
        try:
            data = res.json()
        except Exception:
            data = getattr(res, "content", b"").decode("utf-8", errors="replace")[:200]
        print(f"\n[FALLO] Login como admin: {res.status_code} - {data}. Ejecuta: python manage.py seed_initial_data")
        return 1
    print(f"\n[OK] Login como admin")

    reader = User.objects.filter(username=READER_USER).first()
    if not reader:
        print("[FALLO] Usuario reader_test no existe. Ejecuta: python manage.py seed_reader_user")
        return 1

    new_password = "NuevaPass456!"
    r = client.post(
        f"/api/users/{reader.id}/reset-password/",
        {"password": new_password},
        format="json",
    )
    if r.status_code != 200:
        try:
            data = r.json()
        except Exception:
            data = getattr(r, "content", b"").decode("utf-8", errors="replace")[:200]
        print(f"[FALLO] Reset password: {r.status_code} - {data}")
        return 1
    print(f"[OK] Admin restableció contraseña de {READER_USER}")

    client.credentials()  # quitar token de admin

    # 4. Login como reader con la nueva contraseña
    ok, res = login(client, READER_USER, new_password)
    if not ok:
        try:
            data = res.json()
        except Exception:
            data = getattr(res, "content", b"").decode("utf-8", errors="replace")[:200]
        print(f"[FALLO] Login como reader con nueva contraseña: {res.status_code} - {data}")
        return 1
    print(f"[OK] Reader inició sesión con la nueva contraseña")

    print("\n=== Validación completada ===")
    return 0


if __name__ == "__main__":
    sys.exit(main())
