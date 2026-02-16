# Mejoras recomendadas – SGI Hospital v3

Revisión realizada sobre el código actual. Prioridad: **A** = alta, **M** = media, **B** = baja.

---

## 1. Frontend

### 1.1 UX y feedback (A)
- **Loading en Config**: En Configuración no hay indicador de carga al abrir; las pestañas (Usuarios, Roles, Catálogos, etc.) cargan en segundo plano. Añadir un `loading` global o por pestaña evita la impresión de que “no pasa nada”.
- **Errores en Config**: ✅ Hecho – los `load*` de Config muestran toast de error si fallan.
- **Spinner en listados**: En páginas como Indicadores, Riesgos, Comités, etc. considerar un estado `loading` y un spinner o skeleton mientras llegan los datos (igual que en Documentos y Dashboard).

### 1.2 Estructura y mantenibilidad (A)
- **pages.jsx muy grande**: Un solo archivo con todas las páginas (~3200+ líneas) dificulta mantener y hacer pruebas. Recomendación: dividir por sección (Dashboard, Documents, Config, ProcessMap, Support, etc.) en archivos bajo `pages/` o `views/` e importar en `App`/rutas.
- **Lógica duplicada**: Patrones repetidos (load + setState + catch, formularios modales, tablas con acciones). Extraer hooks (`useConfigData`, `useUsers`, etc.) y componentes reutilizables reduce duplicación y errores.

### 1.3 Seguridad y buenas prácticas (M)
- **Secrets en Config**: Los campos SMTP/OAuth (contraseña, client_secret, refresh_token) se manejan como texto; en pantalla ya usan `type="password"`. Asegurar que no se envíen en logs ni se muestren en URLs; en producción considerar no devolver el valor completo en GET si no es necesario.
- **Validación de contraseña en frontend**: En “Restablecer contraseña” y “Nuevo usuario” se podría validar longitud/criterios en el cliente (≥6, etc.) antes de enviar, para dar feedback inmediato y alinear con el backend.

### 1.4 Accesibilidad y robustez (M)
- **Labels y roles**: Revisar que todos los inputs tengan `<label>` asociado (por id o aria-label) y que los botones de acción tengan texto o aria-label claro.
- **Manejo de 403/404**: En algunas vistas, un 403 solo deja la tabla vacía. Mostrar un mensaje explícito (“No tienes permiso” / “Recurso no encontrado”) mejora la experiencia.

---

## 2. Backend

### 2.1 Seguridad (A)
- **SECRET_KEY y JWT en producción**: En `settings.py` y `.env.example` hay valores por defecto (“change-me-in-production…”). En producción es obligatorio usar variables de entorno con secretos fuertes y no commitear `.env` con valores reales.
- **Rate limiting**: No hay límite de peticiones por IP/usuario. Añadir throttling (p. ej. `throttle_classes` en DRF o middleware) en login y en APIs sensibles reduce riesgo de fuerza bruta y abuso.

### 2.2 Validación y consistencia (M)
- **Longitud de contraseña**: El endpoint de reset ya exige ≥6 caracteres; el serializer de usuario podría validar lo mismo en creación/actualización para no crear contraseñas débiles.
- **Respuestas de error unificadas**: `custom_exception_handler` ya normaliza a `{ "error": ... }`. Revisar que todos los endpoints que devuelven error (p. ej. validación de negocio) usen el mismo formato para que el frontend pueda mostrar siempre `error` de forma consistente.

### 2.3 Rendimiento y escalabilidad (B)
- **Paginación**: Ya está configurada (`PAGE_SIZE = 20`). Verificar que listados grandes (documentos, logs, usuarios) usen siempre la paginación y no carguen todo en memoria.
- **Consultas N+1**: En ViewSets que usan `select_related`/`prefetch_related` está bien; revisar cualquier serializer que acceda a relaciones sin prefetch en listados.

---

## 3. Testing y calidad

### 3.1 Cobertura (M)
- **Tests de API**: Hay tests de dominio (auth, procesos, roles, reset password). Ampliar con tests para: documentos (subida/descarga), soporte (crear ticket), configuración (SMTP/roles/permisos), y que reader no pueda hacer POST en otros recursos (riesgos, indicadores, etc.).
- **Frontend**: No hay tests (unitarios ni E2E). Añadir al menos pruebas para flujos críticos (login, cambio de contraseña, Config con permisos) da confianza en refactors.

### 3.2 Integración y despliegue (B)
- **Script de validación**: `validate_roles_and_reset.py` es útil; documentar en README o en `docs/VALIDACION_CONFIG.md` que para ejecutarlo hace falta tener creado el usuario reader (`seed_reader_user`).
- **Health check**: ✅ Hecho – `GET /api/health` devuelve `{"status":"ok"}` sin autenticación.

---

## 4. Resumen de prioridades

| Prioridad | Acción |
|-----------|--------|
| **A** | ~~Mostrar errores en Config~~ ✅ Hecho. |
| **A** | ~~Dividir `pages.jsx` en módulos~~ ✅ Hecho (pages/common, LoginPage, NotFoundPage, Pages, index). |
| **A** | ~~Asegurar secretos; documentar en README~~ ✅ Hecho. |
| **M** | ~~Loading/feedback en Config y en listados~~ ✅ Hecho (spinner en DataTable, Config con configLoading). |
| **M** | ~~Mensajes 403/404 claros~~ ✅ Hecho (extractError distingue 403 y 404). |
| **M** | ~~Validación de contraseña en frontend~~ ✅ Hecho (≥6 chars en Cambiar contraseña, Nuevo usuario, Reset). |
| **M** | Rate limiting en login y opcionalmente en APIs públicas. |
| **M** | Más tests API (documentos, soporte, permisos reader). |
| **B** | ~~Endpoint `/api/health`~~ ✅ Hecho. ~~Validación de contraseña en frontend~~ ✅ Hecho. |
| **B** | ~~Documentar script validación~~ ✅ Hecho en README. Paginación: backend PAGE_SIZE=20 activo; frontend usa primera página. |

Este documento se puede ir actualizando conforme se implementen las mejoras.
