# Hospital v3 - Sistema de Gestión Hospitalaria

Sistema completo de gestión hospitalaria desplegado en Azure.

## 🌐 Aplicación en Producción

- **Frontend**: https://salmon-desert-01d56c70f.1.azurestaticapps.net
- **Backend API**: https://hospital-api-carlosdev.azurewebsites.net

## 🏗️ Arquitectura

- **Frontend**: React + Vite desplegado en Azure Static Web Apps
- **Backend**: Django + DRF desplegado en Azure App Service
- **Base de Datos**: SQLite (demo) - Migrar a Azure PostgreSQL para producción
- **CI/CD**: GitHub Actions para deployment automático

## 🚀 Deployment Automático

Cada push a la rama `main` activa automáticamente:
- Build del frontend con Vite
- Deployment a Azure Static Web Apps
- El backend se despliega manualmente via Azure CLI

## 📝 Variables de Entorno

Ver `deploy-secrets.env.example` para las variables necesarias.

## 🛠️ Desarrollo Local

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

# Frontend
cd frontend
npm install
npm run dev
```

## 📦 Despliegue Manual

Ver `DEPLOY_AZURE.md` y `scripts/deploy-azure-cli.md` para instrucciones detalladas.
