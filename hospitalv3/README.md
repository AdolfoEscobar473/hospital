# hospitalv3 - Django DRF + React + PostgreSQL

Migracion paralela de `hospitalv2` hacia nueva arquitectura.

## Estructura

- `backend/`: Django + DRF + JWT + apps por dominio.
- `frontend/`: React + Vite + rutas protegidas + cliente API.
- `docs/`: contratos API, ETL y plan de cutover.
- `scripts/`: utilidades operativas (ETL, smoke).

## Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
copy .env.example .env
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py seed_initial_data
.\.venv\Scripts\python.exe manage.py runserver 8000
```

## Frontend

```powershell
cd frontend
npm install
copy .env.example .env
npm run dev
```

## Pruebas ejecutadas

- Backend: `manage.py test` (OK, 5 pruebas).
- Frontend: `npm run lint` (OK) y `npm run build` (OK).

## ETL desde SQLite

Ver `docs/ETL_SQLITE_A_POSTGRES.md`.

Comando rapido:

```powershell
cd backend
.\.venv\Scripts\python.exe manage.py etl_from_sqlite --sqlite-path "c:\Users\SANDRA\Downloads\HOSPITAL\desarrollo-hospital-1\hospitalv2\hospital.db"
```

## Docker compose

```powershell
cd ..
docker compose -f hospitalv3\docker-compose.yml up --build
```

## Smoke rapido

Con backend iniciado y usuario admin sembrado:

```powershell
.\scripts\smoke.ps1 -ApiBase "http://localhost:8000/api" -Username "admin" -Password "admin123"
```

## Producción y secretos

En **producción** no uses los valores por defecto de `.env.example`. Configura:

- **DJANGO_SECRET_KEY**: cadena aleatoria de al menos 32 caracteres (genera con `python -c "import secrets; print(secrets.token_urlsafe(40))"`).
- **JWT_SECRET**: otro secreto distinto para firmar tokens JWT (también ≥32 caracteres).
- **POSTGRES_PASSWORD**, **CORS_ALLOWED_ORIGINS**, **DJANGO_ALLOWED_HOSTS** según tu dominio e infra.

No subas el archivo `.env` con valores reales al repositorio. Usa variables de entorno del servidor o un gestor de secretos.

## Validación de roles y restablecer contraseña

Para ejecutar el script de validación de permisos por rol y flujo de restablecer contraseña:

```powershell
cd backend
python manage.py seed_reader_user
python scripts/validate_roles_and_reset.py
```

El script requiere que exista el usuario `reader_test` (creado con `seed_reader_user`). Ver `docs/VALIDACION_CONFIG.md` para pasos manuales.
