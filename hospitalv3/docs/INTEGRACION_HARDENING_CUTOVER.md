# Integracion, hardening, cutover y rollback

## Checklist de integracion final

1. Backend en verde:
   - `python manage.py check`
   - `python manage.py test`
2. Frontend en verde:
   - `npm run lint`
   - `npm run build`
3. Datos migrados:
   - ejecutar `etl_from_sqlite`
   - revisar `ETL_RECONCILIATION.json`
4. Pruebas E2E minimas:
   - login/logout
   - dashboard carga
   - crear proceso/documento/riesgo/accion
   - comite + compromiso + close + reminders
   - soporte + configuracion

## Hardening recomendado antes de salida

- Definir `DJANGO_SECRET_KEY` y `JWT_SECRET` robustos.
- Ajustar `DJANGO_DEBUG=false`.
- Configurar CORS productivo estricto.
- Activar HTTPS en reverse proxy.
- Rotar credenciales SMTP/OAuth y restringir permisos.
- Monitorear `/api/client-logs` y `/api/logs`.

## Estrategia de cutover gradual

1. **Piloto interno** (modulos: dashboard, comites, riesgos).
2. **Operacion dual**: mantener `hospitalv2` y `hospitalv3` en paralelo.
3. **Conmutacion por modulo**:
   - Documentos
   - Riesgos/Acciones/Indicadores
   - Comites
   - Soporte/Configuracion
4. **Conmutacion total** cuando:
   - incidentes criticos = 0 por 7 dias
   - reconciliacion de datos validada
   - usuarios clave entrenados

## Plan de rollback rapido

- Mantener `hospitalv2` en produccion durante estabilizacion.
- Si falla un flujo critico:
  - redirigir trafico al frontend legacy
  - congelar escrituras en `hospitalv3`
  - documentar incidente y reprocesar ETL incremental
- Reintentar salida despues de resolver causa raiz y revalidar checklist.
