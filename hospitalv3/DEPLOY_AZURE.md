# Desplegar en Microsoft Azure

Este documento indica qué está implementado y qué configurar en Azure para el backend (Django) y el frontend (React).

**Despliegue solo con CLI (sin GitHub):** Ver [scripts/deploy-azure-cli.md](scripts/deploy-azure-cli.md) para comandos `az`, script PowerShell de deploy del backend y pasos para Static Web Apps desde tu PC.

---

## 1. Qué está implementado en el proyecto

- **Backend (Django)**
  - `gunicorn` y `whitenoise` en `requirements.txt` (servir estáticos en App Service).
  - `config/settings.py`: `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS` y `CSRF_TRUSTED_ORIGINS` leen desde variables de entorno (para poner las URLs de Azure).
  - Middleware `WhiteNoise` para archivos estáticos.
  - `backend/startup.sh`: script de arranque que hace `collectstatic`, `migrate` y arranca gunicorn en el `PORT` que define Azure.

- **Frontend (React/Vite)**
  - La API se configura con `VITE_API_URL` en tiempo de build. En producción debe apuntar a la URL del backend en Azure.

---

## 2. Opciones en Azure

| Componente   | Servicio de Azure recomendado     | Notas                                      |
|-------------|-------------------------------------|--------------------------------------------|
| Backend API | **Azure App Service** (Linux, Python) | Corre Django con gunicorn                  |
| Frontend    | **Azure Static Web Apps** o **App Service** | Static Web Apps es más simple para SPA     |
| Base de datos | **Azure Database for PostgreSQL** o SQLite (solo demo) | Producción: PostgreSQL en Azure           |
| Archivos (media) | **Azure Blob Storage** (opcional) | Para subir documentos/imágenes en producción |

---

## 3. Backend: Azure App Service (Django)

### 3.1 Crear el App Service

1. En Azure Portal: **App Service** → **Create**.
2. **Runtime:** Python 3.10 o 3.11.
3. **Operating system:** Linux.
4. Elija plan (ej. B1 para pruebas, F1 gratis con limitaciones).

### 3.2 Configuración del despliegue

- **Configuración general:** raíz del repo o carpeta donde esté el backend (ej. `hospitalv3/backend` si el repo es la raíz del proyecto).
- **Build:** Azure puede usar **OCI** (build automático) o tú defines:
  - Comando de build: `pip install -r requirements.txt`
  - Comando de inicio: usar el script de arranque (ver abajo).

### 3.3 Comando de inicio (Startup Command)

En App Service → **Configuration** → **General settings** → **Startup Command**:

```bash
bash startup.sh
```

O sin script:

```bash
python manage.py collectstatic --noinput && python manage.py migrate --noinput && gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 2
```

Si Azure inyecta la variable `PORT`, usa:

```bash
gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 2
```

(En `startup.sh` ya se usa `PORT`.)

### 3.4 Variables de entorno (Application settings)

En **Configuration** → **Application settings** añada (y marque como slot setting si usa slots):

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DJANGO_SECRET_KEY` | Clave secreta Django (producción) | Cadena larga y aleatoria |
| `DJANGO_DEBUG` | Solo para pruebas en Azure | `false` |
| `DJANGO_ALLOWED_HOSTS` | Dominio del App Service | `tu-app.azurewebsites.net` |
| `CORS_ALLOWED_ORIGINS` | URL del frontend (Static Web Apps o donde esté) | `https://tu-frontend.azurestaticapps.net` |
| `CSRF_TRUSTED_ORIGINS` | Misma URL del frontend | `https://tu-frontend.azurestaticapps.net` |
| `USE_SQLITE` | Usar SQLite (solo demo) | `true` |
| Para PostgreSQL (producción): | | |
| `POSTGRES_HOST` | Servidor Azure DB | `tu-server.postgres.database.azure.com` |
| `POSTGRES_NAME` | Nombre de la base de datos | `hms` |
| `POSTGRES_USER` | Usuario | `usuario@tu-server` |
| `POSTGRES_PASSWORD` | Contraseña | (segura) |
| `POSTGRES_PORT` | Puerto | `5432` |

No ponga `USE_SQLITE=true` si usa PostgreSQL.

### 3.5 Archivos subidos (media)

Por defecto `MEDIA_ROOT` es una carpeta local; en App Service el sistema de archivos no es persistente. Para producción:

- Opción A: Usar **Azure Blob Storage** y configurar `django-storages` con backend de Azure (no está en el proyecto; se puede añadir después).
- Opción B: Dejar en disco solo para demos (los archivos se pierden al reiniciar/redeploy).

---

## 4. Frontend: Azure Static Web Apps (React)

1. En Azure: **Static Web Apps** → **Create**.
2. Conecte el repositorio (GitHub/Azure DevOps).
3. **Build details:**
   - **App location:** carpeta del frontend, ej. `hospitalv3/frontend`.
   - **Build command:** `npm install && npm run build`.
   - **Output location:** `dist` (salida por defecto de Vite).

4. Añada una variable de configuración en **Configuration** (o en el workflow de GitHub Actions que genera Azure):
   - **Name:** `VITE_API_URL`
   - **Value:** URL de la API en Azure, ej. `https://tu-app.azurewebsites.net/api`

Así el frontend en producción llamará a tu backend en Azure. Reinicie o vuelva a desplegar el frontend después de cambiar `VITE_API_URL`.

---

## 5. Resumen de pasos

1. **Backend:** Crear App Service (Python/Linux), configurar startup (por ejemplo `bash startup.sh`), definir variables de entorno (incluidas `DJANGO_ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS` con la URL del frontend).
2. **Frontend:** Crear Static Web App, apuntar a la carpeta del frontend, build `npm run build`, output `dist`, y definir `VITE_API_URL` con la URL del backend.
3. **Base de datos:** Para demo puede usar SQLite (`USE_SQLITE=true`). Para producción, crear Azure Database for PostgreSQL y usar las variables `POSTGRES_*`.
4. Probar login y flujos que llamen a la API; si hay errores CORS o 403, revisar `CORS_ALLOWED_ORIGINS` y `CSRF_TRUSTED_ORIGINS`.

---

## 6. Comprobar que el backend arranca

En la consola de desarrollo (SSH) del App Service o en los logs:

- Debe ejecutarse `collectstatic` y `migrate`.
- El proceso que escucha debe ser gunicorn en el puerto que indique Azure (variable `PORT` o 8000 según cómo lo haya configurado).

Si aparece error 500, revise los logs del App Service y que `DJANGO_SECRET_KEY` y `DJANGO_ALLOWED_HOSTS` estén bien definidos.
