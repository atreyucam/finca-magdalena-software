# AUDITORIA RUNTIME Y NOTIFICACIONES

Fecha: 2026-03-09
Alcance: validación runtime integral + auditoría técnica profunda del sistema de notificaciones (backend, frontend, socket, persistencia, UX y preparación PWA/móvil).

## 1. Resumen Ejecutivo

El sistema sí tiene una base operativa funcional en runtime para autenticación, inventario y tareas, y el frontend compila correctamente. Sin embargo, el módulo de notificaciones presenta problemas estructurales que deben corregirse antes de iniciar Compras:

- Hallazgo crítico confirmado: un usuario autenticado puede suscribirse por socket a la sala de otro usuario usando `join:user` y recibir notificaciones ajenas en tiempo real.
- Arquitectura de notificaciones dispersa: se crean notificaciones desde varios módulos sin una capa de eventos de dominio central.
- Estrategia de entrega redundante: para una misma notificación se emite `notif:nueva` y `notif:refresh`, mientras frontend además hace polling periódico.
- Sin lifecycle de datos: no existe retención, expiración, archivado ni limpieza automática de notificaciones.

Conclusión ejecutiva: no conviene avanzar a Compras sin estabilizar primero notificaciones y su seguridad de socket.

## 2. Estado Actual de Validación Integral Runtime

### Entorno y comandos ejecutados

- Backend tests de estabilización:
  - `backend`: `npm test -- src/test/stabilization --runInBand`
  - Resultado: 8 suites / 26 tests PASSED.
- Tests de tareas heredados:
  - `backend`: `npm test -- src/test/tareas --runInBand`
  - Resultado: FAILED por dependencia de host DB `db` y timeouts de setup.
- Frontend build:
  - `frontend`: `npm run build`
  - Resultado: build exitoso.
- Runtime local backend sin Docker:
  - `backend`: `npm start`
  - Resultado: falla por `getaddrinfo ENOTFOUND db` (host dockerizado no resoluble fuera de compose).
- Runtime Docker:
  - `docker compose -f docker-compose.yml -f docker-compose.dev.yml ps`
  - Resultado: `finca_db` healthy, `finca_api` up.
- Health API:
  - `GET /health`
  - Resultado: `{ ok: true }`.

### Validación funcional runtime ejecutada (API real + DB real + socket)

- Autenticación/sesión:
  - Login OK (`/auth/login`).
  - Refresh OK (`/auth/refresh`).
  - Logout (`/auth/logout`) y refresh posterior falla con 401 como esperado.
- Notificaciones:
  - Listado `/notificaciones` OK.
  - Creación de evento de negocio (`POST /fincas`) incrementa notificaciones en DB.
  - Marcado individual y masivo de leídas (`PATCH /notificaciones/:id/leida`, `POST /notificaciones/leidas`) OK.
- Inventario:
  - Creación de ítem simplificado (`POST /inventario/items`) OK.
  - Ajuste stock sin lote/vencimiento (`POST /inventario/items/:id/ajustes`) OK.
  - Listado simplificado (`GET /inventario/items`) consistente.
- Tareas/cosecha simplificada:
  - Creación tarea cosecha (`POST /tareas`) con fecha-hora real OK.
  - Completar tarea con clasificaciones (`POST /tareas/:id/completar`) y persistencia de `exportacion/nacional/rechazo/total_gavetas` OK cuando el payload respeta el contrato actual (`detalle.clasificacion`).
- Socket:
  - Conexión autenticada OK.
  - Para una sola notificación se observó emisión doble esperada actualmente: `notif:nueva=1` y `notif:refresh=1`.

## 3. Flujos Realmente Validados

- Sesión backend (login/refresh/logout + invalidación de refresh tras logout).
- Emisión de notificaciones por eventos de dominio reales y persistencia en DB.
- Lectura/marcado de notificaciones por API.
- Ajustes simplificados de inventario en runtime.
- Flujo base de tarea cosecha simplificada en runtime (crear/completar/persistir detalle simple).
- Socket notificaciones conectado con JWT y recepción de eventos en cliente real.

## 4. Flujos Insuficientemente Validados

- Navegación visual end-to-end en navegador real (campana + página de notificaciones + interacción de UX completa) no se validó con UI automation en este entorno CLI.
- Cobertura de regresión de tests legacy de tareas es inestable por acoplamiento al host `db` en entorno no-compose.
- No hay pruebas automáticas de carga/concurrencia de notificaciones (multi-tab, multi-sesión, ráfagas de eventos).
- No hay validación de ciclo de vida (retención/purga) porque hoy no existe implementación.

## 5. Estado Actual del Sistema de Notificaciones Backend

Evidencia principal:

- Modelo: `backend/src/db/models/notificacion.js`
  - Campos: `usuario_id`, `tipo`, `titulo`, `mensaje`, `referencia(JSONB)`, `leida`, `prioridad`, timestamps.
- Servicio: `backend/src/modules/notificaciones/notificaciones.service.js`
  - Crea en DB y emite socket desde la misma función.
  - Emite dos eventos por cada creación: `notif:nueva` y `notif:refresh`.
- Rutas: `backend/src/modules/notificaciones/notificaciones.routes.js`
  - Soporta listar, marcar una, marcar todas.
  - No expone archivado, borrado, retención, ni paginado cursor avanzado.
- Puntos de creación dispersos (no centralizados):
  - `tareas.service.js`
  - `inventario.service.js`
  - `pagos.service.js`
  - `fincas.service.js`
  - `lotes.services.js`
  - `cosechas.service.js`

Diagnóstico backend:

- La creación está dispersa por módulo, sin capa única de “evento de dominio -> notificación”.
- Persistencia y emisión están acopladas en un único servicio, sin estrategia de canales de entrega.
- No hay política de deduplicación/idempotencia.
- No hay lifecycle de datos (retención/purga/archivado).

## 6. Estado Actual del Sistema de Notificaciones Frontend

Evidencia principal:

- Store: `frontend/src/store/notificacionesStore.js`
  - Escucha socket `notif:nueva` y `notif:refresh`.
  - `notif:nueva` inserta en memoria si no existe ID.
  - `notif:refresh` fuerza recarga API (`cargar({ silent: true })`).
- Hook: `frontend/src/hooks/useNotificaciones.js`
  - Hace bind de socket y carga inicial.
- Campana: `frontend/src/components/NotificationsBell.jsx`
  - Polling cada 20s + refresh por visibilidad + carga al abrir panel.
- Página: `frontend/src/pages/Notificaciones.jsx`
  - Reutiliza el mismo store de campana.

Diagnóstico frontend:

- Existe mezcla de estrategias de actualización: push (socket) + pull (polling).
- El store puede disparar recargas concurrentes por `silent=true` sin freno estricto.
- No se observó reset explícito de store de notificaciones al logout/cambio de usuario.
- Campana y página comparten valor, pero el diseño actual duplica responsabilidades operativas (resumen + histórico sin lifecycle).

## 7. Flujo Completo Backend -> DB -> Socket -> Frontend

Flujo actual observado:

1. Módulo de negocio (ej. tareas, fincas, inventario) llama `notificaciones.service`.
2. `models.Notificacion.create(...)` persiste fila en `notificaciones`.
3. Servicio emite socket a `user:{usuario_id}` con:
   - `notif:nueva` (payload completo)
   - `notif:refresh` (trigger de recarga)
4. Frontend store:
   - `notif:nueva`: intenta insertar en la lista local.
   - `notif:refresh`: dispara `GET /notificaciones`.
5. Campana además hace polling cada 20 segundos.

Resultado: para un evento único hay múltiples señales de refresco (push payload + push refresh + polling), con costo adicional de red y complejidad de consistencia.

## 8. Problemas Confirmados de Duplicación, Acumulación o Inconsistencia

### Crítico: fuga horizontal por socket room

- Archivo: `backend/src/server.js`.
- Problema: evento `join:user` permite `socket.join("user:${uid}")` sin verificar que `uid` coincida con usuario autenticado.
- Validación runtime confirmada:
  - Usuario A (`a.camacho`) se suscribió a room de usuario B (`g.villacis`) vía `join:user`.
  - Al crear tarea por B, A recibió `notif:nueva` de B en tiempo real.
  - En DB de A no se creó notificación nueva (la fuga es en canal realtime, no persistencia).
  - Control sin `join:user`: A no recibió eventos.

### Redundancia de emisión

- `notificaciones.service` emite `notif:nueva` y `notif:refresh` por cada inserción.
- Prueba runtime: contador observado `nueva=1`, `refresh=1` para una sola notificación.

### Redundancia push + polling

- Campana refresca cada 20s y además por visibilidad y además por socket refresh.
- Riesgo de sobre-consumo de API y recargas innecesarias.

### Crecimiento sin control

- No existe política de retención/expiración/archivo/purga.
- Todo evento queda histórico indefinidamente en `notificaciones`.

### Acoplamiento de contrato de rutas

- Backend expone notificaciones en `/notificaciones` (no `/api/notificaciones`).
- Frontend en producción usa base `/api` según `apiClient`, lo que requiere proxy/rewrite correcto para evitar 404.

## 9. Evaluación de la Campana

Fortalezas:

- Badge de no leídas y acceso rápido.
- Soporta marcado y navegación contextual.

Debilidades:

- Mezcla de polling + socket + refresh por visibilidad.
- Puede generar exceso de requests.
- No distingue claramente entre “alerta inmediata” y “histórico persistente”.

Veredicto: útil, pero la estrategia técnica de actualización debe simplificarse.

## 10. Evaluación de la Página de Notificaciones

Fortalezas:

- Vista tabular y paginada.
- Acciones de marcar leídas.

Debilidades:

- Solapa funcionalidad con la campana sin lifecycle diferenciado.
- Sin archivado/filtros de ciclo de vida (reciente, leída, archivada, expirada).

Veredicto: puede mantenerse si se redefine como “historial operacional” con lifecycle claro.

## 11. Evaluación de Persistencia y Ciclo de Vida

Estado actual:

- Solo estado `leida`/`no leida`.
- Sin `read_at`, `archived_at`, `expires_at`, `deleted_at`, `channel_status`.
- Sin jobs de limpieza.

Implicación:

- Se mezcla “notificación como dato histórico” y “notificación como evento de entrega” en un único registro sin trazabilidad de canal.

## 12. Riesgos de Crecimiento de Basura en DB

- Crecimiento lineal indefinido de tabla `notificaciones`.
- Mayor costo en consultas de usuario y conteos de no leídas.
- Mayor índice/costo de mantenimiento sin beneficio operativo proporcional.
- Riesgo de alert fatigue por notificaciones repetitivas (ej. stock bajo recurrente).

## 13. Preparación o No para Futura PWA/Móvil

Estado actual: parcial e insuficiente.

- Positivo: existe persistencia y canal realtime básico reutilizable.
- Deficiente para PWA/móvil:
  - No hay separación formal de evento de dominio vs notificación entregada por canal.
  - No existe abstracción de canales (web socket hoy, push futuro).
  - No hay trazabilidad de entrega por canal/dispositivo.

Veredicto: la arquitectura actual NO está lista para escalar limpiamente a PWA/push sin refactor.

## 14. Recomendación de Arquitectura Objetivo para Notificaciones

Diseño recomendado (sin implementar en esta auditoría):

1. Capa de eventos de dominio
- Cada módulo publica eventos semánticos (`TAREA_COMPLETADA`, `STOCK_BAJO`, etc.) en un único `DomainEventPublisher`.

2. Capa de orquestación de notificaciones
- `NotificationOrchestrator` decide destinatarios, prioridad, plantilla y dedupe.

3. Persistencia separada de entrega
- Tabla principal de notificación (payload canónico).
- Tabla de entregas por canal (`notification_deliveries`) con estado por canal (`pending/sent/read/failed`) y metadatos de dispositivo.

4. Adaptadores de canal
- Web realtime (socket).
- Web inbox (API/página).
- Push móvil/PWA (futuro).

5. Lifecycle explícito
- `read_at`, `archived_at`, `expires_at`.
- job de purge por antigüedad (ej. 90/180 días según política).

6. Seguridad de room/socket
- Eliminar `join:user` público o validarlo estrictamente (`uid === socket.user.sub` o solo eventos server-driven).

## 15. Recomendación de Orden de Implementación/Corrección

Orden recomendado antes de Compras:

1. Corregir bug crítico de seguridad socket (`join:user` no autorizado).
2. Unificar estrategia de entrega (quitar redundancia `notif:refresh` o polling agresivo; dejar una política clara).
3. Introducir lifecycle mínimo de notificaciones (al menos `read_at` + retención/purge).
4. Centralizar creación mediante capa de eventos/orquestación (iniciar por módulos con más volumen: tareas e inventario).
5. Ajustar UX: campana como “inmediato” y página como “historial” con filtros de ciclo de vida.
6. Añadir pruebas E2E críticas de notificaciones (persistencia + socket + badge + marcado).

## 16. Conclusión

Con la evidencia runtime actual, la recomendación es corregir notificaciones antes de Compras.

Motivo:

- Hay un fallo crítico de autorización horizontal en tiempo real.
- Existe deuda arquitectónica que puede amplificarse al agregar más eventos (Compras y luego Ventas).
- Sin lifecycle, el crecimiento de datos se volverá costo operativo y técnico acumulativo.

Se puede continuar hacia Compras solo con salvedades, pero técnicamente lo correcto es estabilizar primero este frente para evitar arrastrar problemas de seguridad y consistencia al nuevo dominio.
