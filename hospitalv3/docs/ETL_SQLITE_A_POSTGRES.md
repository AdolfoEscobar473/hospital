# ETL SQLite -> PostgreSQL

## Comando principal

Desde `hospitalv3/backend`:

```powershell
.\.venv\Scripts\python.exe manage.py etl_from_sqlite --sqlite-path "c:\Users\SANDRA\Downloads\HOSPITAL\desarrollo-hospital-1\hospitalv2\hospital.db"
```

## Opciones

- `--truncate`: limpia las tablas destino antes de importar.
- `--tables`: importa solo tablas especificas.
- `--report-path`: ruta para reporte JSON de reconciliacion.

Ejemplo:

```powershell
.\.venv\Scripts\python.exe manage.py etl_from_sqlite --sqlite-path "...\hospital.db" --truncate --tables users user_roles processes documents
```

## Validacion de integridad

- El comando emite por tabla:
  - `sourceCount`
  - `imported`
  - `failed`
  - `targetCount`
  - `reconciled`
- El reporte consolidado queda en `hospitalv3/docs/ETL_RECONCILIATION.json`.
