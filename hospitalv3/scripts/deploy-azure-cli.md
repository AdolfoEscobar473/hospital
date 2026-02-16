# Desplegar en Azure solo con CLI (sin GitHub)

Todo desde tu PC: crear recursos, desplegar backend (zip) y frontend (SWA CLI). Sustituye los valores entre `< >` por los tuyos.

---

## Despliegue automático (contraseña y recursos)

- **Clave y nombres registrados:** En `scripts/deploy-secrets.env` están guardados `DJANGO_SECRET_KEY`, `RESOURCE_GROUP`, `WEBAPP_NAME`, etc. Ese archivo no se sube a Git (está en `.gitignore`).
- **Crear recursos en Azure:** `cd hospitalv3\scripts` y ejecuta `.\run-azure-setup.ps1`. Crea el resource group, plan, Web App y aplica la configuración (usa la clave de `deploy-secrets.env`).
- **Publicar el backend:** Desde la raíz del proyecto ejecuta `.\hospitalv3\scripts\deploy-backend.ps1`. Si existe `deploy-secrets.env`, no hace falta pasar `-ResourceGroup` ni `-WebAppName`.
- **Suscripción activa:** Si falla con `SubscriptionNotFound`, asigna una suscripción: `az account set -s <subscription-id>` (lista con `az account list`).

---

## 1. Crear backend (Resource Group, Plan, Web App)

Ejecuta en orden. Ajusta `RESOURCE_GROUP`, `LOCATION`, `WEBAPP_NAME` y `SECRET_KEY`.

```bash
# Variables (ajusta a tu gusto)
RESOURCE_GROUP="rg-hospital-prod"
LOCATION="eastus"
PLAN_NAME="plan-hospital"
WEBAPP_NAME="hospital-api-tunombre"
SECRET_KEY="tu-clave-secreta-muy-larga-y-aleatoria-min-32-chars"

# Crear resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Crear App Service plan (Linux). F1 = gratis, B1 = básico de pago
az appservice plan create --name $PLAN_NAME --resource-group $RESOURCE_GROUP --location $LOCATION --is-linux --sku B1

# Crear Web App con runtime Python 3.10
az webapp create --resource-group $RESOURCE_GROUP --plan $PLAN_NAME --name $WEBAPP_NAME --runtime "PYTHON:3.10"

# Comando de inicio (startup.sh hace collectstatic, migrate y gunicorn)
az webapp config set --resource-group $RESOURCE_GROUP --name $WEBAPP_NAME --startup-file "bash startup.sh"

# Application settings (URL del frontend la actualizas después del paso 4)
az webapp config appsettings set --resource-group $RESOURCE_GROUP --name $WEBAPP_NAME --settings \
  DJANGO_SECRET_KEY="$SECRET_KEY" \
  DJANGO_DEBUG="false" \
  DJANGO_ALLOWED_HOSTS="${WEBAPP_NAME}.azurewebsites.net" \
  USE_SQLITE="true" \
  CORS_ALLOWED_ORIGINS="https://placeholder.azurestaticapps.net" \
  CSRF_TRUSTED_ORIGINS="https://placeholder.azurestaticapps.net"
```

La API quedará en: `https://<WEBAPP_NAME>.azurewebsites.net/api`

---

## 2. Desplegar el backend (zip desde tu PC)

### Opción A: Script PowerShell (recomendado)

Desde la raíz del proyecto (donde está `hospitalv3`):

```powershell
.\hospitalv3\scripts\deploy-backend.ps1 -ResourceGroup "rg-hospital-prod" -WebAppName "hospital-api-tunombre"
```

El script crea el zip del backend (excluyendo venv, __pycache__, .env, db.sqlite3) y ejecuta `az webapp deploy`.

### Opción B: Manual

1. Comprimir el **contenido** de `hospitalv3/backend` en un zip (no la carpeta `backend` misma). Excluir: `venv`, `__pycache__`, `.env`, `db.sqlite3`, `*.pyc`, `staticfiles`.

2. Desplegar:

```bash
az webapp deploy --resource-group rg-hospital-prod --name hospital-api-tunombre --src-path ruta/al/backend.zip --type zip
```

3. Comprobar: abre `https://<WEBAPP_NAME>.azurewebsites.net/api/` en el navegador (puede devolver 401 o listado de rutas; si responde, el backend está bien).

---

## 3. Crear Static Web App y obtener deployment token

```bash
# Mismo resource group y ubicación
RESOURCE_GROUP="rg-hospital-prod"
LOCATION="eastus"
SWA_NAME="hospital-app-tunombre"

az staticwebapp create --name $SWA_NAME --resource-group $RESOURCE_GROUP --location $LOCATION
```

Obtener el token para desplegar desde local:

```bash
az staticwebapp secrets list --name $SWA_NAME --resource-group $RESOURCE_GROUP --query "properties.apiKey" -o tsv
```

Guarda ese token; lo usarás en el paso 4. La URL del frontend será algo como: `https://<SWA_NAME>.azurestaticapps.net`.

---

## 4. Build del frontend y publicar con SWA CLI

1. Instalar SWA CLI (una vez):

```bash
npm install -g @azure/static-web-apps-cli
```

2. En tu PC, desde la carpeta del frontend, construir con la URL del backend:

**PowerShell:**

```powershell
cd hospitalv3\frontend
$env:VITE_API_URL="https://hospital-api-tunombre.azurewebsites.net/api"
npm run build
```

**Bash:**

```bash
cd hospitalv3/frontend
export VITE_API_URL="https://hospital-api-tunombre.azurewebsites.net/api"
npm run build
```

3. Desplegar la carpeta `dist`:

```bash
swa deploy ./dist --deployment-token <PEGA_AQUI_EL_TOKEN_DEL_PASO_3> --env production
```

La app quedará publicada en `https://<SWA_NAME>.azurestaticapps.net`.

---

## 5. Actualizar CORS/CSRF en el backend con la URL del frontend

Una vez tengas la URL real del Static Web App (ej. `https://hospital-app-tunombre.azurestaticapps.net`), actualiza el backend:

```bash
az webapp config appsettings set --resource-group rg-hospital-prod --name hospital-api-tunombre --settings \
  CORS_ALLOWED_ORIGINS="https://hospital-app-tunombre.azurestaticapps.net" \
  CSRF_TRUSTED_ORIGINS="https://hospital-app-tunombre.azurestaticapps.net"
```

Así el login y las llamadas desde el frontend en la nube funcionarán sin errores CORS/CSRF.

---

## Resumen de variables

| Variable | Dónde | Ejemplo |
|----------|--------|---------|
| `DJANGO_SECRET_KEY` | Backend (App Service) | Cadena larga aleatoria |
| `DJANGO_ALLOWED_HOSTS` | Backend | `<webapp>.azurewebsites.net` |
| `CORS_ALLOWED_ORIGINS` / `CSRF_TRUSTED_ORIGINS` | Backend | URL del Static Web App |
| `VITE_API_URL` | Build del frontend (solo en build) | `https://<webapp>.azurewebsites.net/api` |

---

## Re-despliegos posteriores

- **Backend:** vuelve a ejecutar el script `deploy-backend.ps1` o `az webapp deploy` con un nuevo zip.
- **Frontend:** `npm run build` con `VITE_API_URL` y luego `swa deploy ./dist --deployment-token <token> --env production`.
