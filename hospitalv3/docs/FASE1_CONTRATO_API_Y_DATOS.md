# Fase 1 - Contrato API y mapa de datos

Este documento congela el baseline funcional extraido de `hospitalv2` y su equivalente inicial en `hospitalv3`.

## 1) Endpoints baseline (hospitalv2)

- Auth: `/api/auth/login`, `/api/auth/refresh`, `/api/auth/profile`, `/api/auth/logout`, `/api/auth/change-password`, `/api/auth/forgot`.
- Users y roles: `/api/users`, `/api/roles`.
- Procesos: `/api/processes`, `/api/processes/grouped`, `/api/processes/statistics`, `/api/processes/:id/summary`, `/api/processes/:id/health`, `/api/process-characterization/:processId`.
- Documentos: `/api/documents`, `/api/documents/statistics`, `/api/documents/:id/download`, `/api/documents/zip`, `/api/document-types`.
- Riesgos y acciones: `/api/risks`, `/api/risks/matrix`, `/api/risks/matrix-5x5`, `/api/risks/statistics`, `/api/actions`, `/api/actions/statistics`.
- Comites: `/api/committees`, `/api/committee-sessions`, `/api/commitments`, `/api/commitments/reminders`.
- Indicadores: `/api/indicators`, `/api/indicators/statistics`.
- Dashboard y soporte: `/api/dashboard/summary`, `/api/dashboard/charts`, `/api/search`, `/api/my-work`, `/api/support`.
- Configuracion y operacion: `/api/config/*`, `/api/logs`, `/api/email-logs`, `/api/client-logs`.

## 2) Mapa de tablas legacy (SQLite)

Dominios base detectados desde `hospitalv2/server/src/db.js`:

- Seguridad: `users`, `user_roles`, `refresh_tokens`.
- Procesos SGI: `processes`, `process_characterization`.
- Documental: `documents`, `document_types`.
- Riesgos y mejora: `risks`, `risk_matrix_history`, `actions`, `indicators`, `indicator_history`, `adverse_events`.
- Gobierno: `committees`, `committee_members`, `committee_sessions`, `commitments`.
- Soporte y configuracion: `support_tickets`, `roles_config`, `catalog_items`, `column_settings`, `smtp_config`, `oauth_config`, `storage_config`.
- Trazabilidad: `audit_logs`, `email_logs`, `client_logs`.

## 3) Convenciones de respuesta API (hospitalv3)

- IDs UUID en todos los dominios.
- Fechas ISO-8601 en UTC con TZ.
- Errores: `{"error":"mensaje"}` con codigo HTTP semantico.
- Listados con orden descendente por `created_at` cuando aplique.
- Estadisticas por modulo en endpoints `*/statistics`.

## 4) Paridad inicial implementada en hospitalv3

- Ya existe exposicion de endpoints base bajo `/api/*` en Django DRF.
- JWT implementado con refresh rotativo.
- CRUD por dominio + endpoints de soporte (estadisticas, matrix, grouped, reminders, zip de documentos).
- Esquema OpenAPI disponible en `/api/schema` y docs en `/api/docs`.
