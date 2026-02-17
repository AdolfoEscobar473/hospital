# Deploy Backend con Staging y Swap

Workflow: `.github/workflows/backend-staging-swap.yml`

## Objetivo

- Desplegar backend en slot `staging`.
- Ejecutar migraciones de forma explicita (no en startup).
- Validar salud/CORS.
- Hacer `swap` a `production` sin downtime.

## Secrets requeridos en GitHub

- `AZURE_CREDENTIALS`
- `POSTGRES_ADMIN_HOST`
- `POSTGRES_ADMIN_PORT` (opcional, por defecto `5432`)
- `POSTGRES_ADMIN_DB`
- `POSTGRES_ADMIN_USER`
- `POSTGRES_ADMIN_PASSWORD`

## Notas operativas

- La aplicacion en runtime usa el usuario limitado `hospitalapp_runtime`.
- Las migraciones del pipeline usan usuario admin de PostgreSQL.
- El startup de App Service ya no ejecuta `migrate`; solo levanta Gunicorn.
