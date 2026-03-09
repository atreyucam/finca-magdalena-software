# ESTABILIZACION NOTIFICACIONES Y SOCKET

Fecha: 2026-03-09

## 1. Objetivo de la etapa

Estabilizar de forma crítica el sistema de notificaciones y tiempo real para dejarlo seguro, coherente y mantenible antes de continuar con Compras, corrigiendo seguridad socket, duplicación de entrega, coherencia frontend, lifecycle mínimo y validación runtime real.

## 2. Alcance ejecutado

- Seguridad de rooms socket para notificaciones.
- Servicio backend de notificaciones (emisión, dedupe, lectura, lifecycle).
- Persistencia de `read_at`.
- Retención + purga por antigüedad (90 días, configurable).
- Campana frontend (flujo rápido, máximo 10, sin polling agresivo).
- Página de notificaciones (acciones coherentes y estado de lectura visible).
- Estado frontend en logout/cambio de sesión (reset store).
- Validaciones técnicas y runtime end-to-end con API + DB + socket.

## 3. Hallazgos confirmados en código real

1. Bug crítico de seguridad: `join:user` permitía suscribirse a room de otro usuario (`backend/src/server.js`).
2. Estrategia redundante: una notificación emitía `notif:nueva` y `notif:refresh` para el mismo evento (`backend/src/modules/notificaciones/notificaciones.service.js`).
3. Frontend mezclaba socket + `notif:refresh` + polling cada 20s (`frontend/src/store/notificacionesStore.js`, `frontend/src/components/NotificationsBell.jsx`).
4. Lifecycle incompleto: modelo solo con `leida`, sin `read_at` y sin purga de antigüedad (`backend/src/db/models/notificacion.js`).
5. Riesgo de spam en stock bajo por repetición de eventos sin dedupe (`backend/src/modules/inventario/inventario.service.js`).

## 4. Cómo funcionaba antes el sistema de notificaciones

- Persistencia: se guardaba `leida`, pero no había `read_at`.
- Emisión: cada creación emitía `notif:nueva` y además `notif:refresh`.
- Socket usuario: además del auto-join server-side, se aceptaban `join:user`/`leave:user` sin validación de ownership.
- Frontend: escuchaba ambos eventos y además tenía polling cada 20s en campana.
- Retención: no existía política ni purga automática.

## 5. Cómo funciona ahora el sistema de notificaciones

- Persistencia: cada notificación maneja `leida` + `read_at`.
- Emisión: una sola señal por evento persistido (`notif:nueva`).
- Seguridad socket: solo auto-join del usuario autenticado; sin suscripción arbitraria a otros usuarios.
- Frontend: estrategia principal realtime por socket + resync en reconexión/visibilidad/apertura, sin polling agresivo periódico.
- Lifecycle: retención configurable (default 90 días) + purga automática programada + función de purga explícita.
- Dedupe: soporte en servicio y aplicado a alertas repetitivas de stock bajo.

## 6. Seguridad de socket

### Problema previo

Un usuario autenticado podía hacer `join:user` con otro `uid` y recibir notificaciones ajenas por tiempo real.

### Solución aplicada

- Eliminados listeners inseguros `join:user` y `leave:user` en `backend/src/server.js`.
- Se mantiene únicamente auto-join a room `user:{sub}` derivado del JWT validado por servidor.
- Se validó runtime que un intento de `join:user` ya no produce fuga ni antes ni después de reconexión.

## 7. Estrategia de entrega

### Qué se eliminó

- Emisión redundante `notif:refresh`.
- Polling cada 20s en campana.

### Qué se mantuvo

- Emisión realtime con `notif:nueva`.
- Carga inicial y resync controlado (apertura de panel, visibilidad, reconexión socket).

### Por qué

Reduce duplicaciones de eventos, evita recargas innecesarias y mantiene consistencia de estado con menor ruido de red.

## 8. Cambios backend

- `backend/src/db/models/notificacion.js`
  - Nuevo campo `read_at`.
  - Índice adicional por `usuario_id/read_at`.
- `backend/src/config/env.js`
  - Config `notifications.retentionDays` (default 90).
  - Config `notifications.purgeIntervalMs` (default 12h).
- `backend/src/modules/notificaciones/notificaciones.service.js`
  - Emisión simplificada a solo `notif:nueva`.
  - Normalización de payload de salida (`read_at` incluido).
  - Dedupe configurable por ventana + referencia.
  - Filtro de notificaciones activas por retención en listados y conteos.
  - `marcarLeida` y `marcarTodas` actualizan `read_at`.
  - Función `purgarAntiguas`.
- `backend/src/modules/inventario/inventario.service.js`
  - Dedupe para alertas de stock bajo (evita spam repetitivo en ventana de 6h).
- `backend/src/server.js`
  - Eliminación de `join:user`/`leave:user` inseguros.
  - Scheduler de purga lifecycle al arranque y por intervalo.
- `backend/src/modules/dashboard/dashboard.service.js`
  - Conteo de no leídas alineado a ventana de retención.

## 9. Cambios frontend

- `frontend/src/store/notificacionesStore.js`
  - Eliminado manejo `notif:refresh`.
  - Listener `connect` para resync controlado.
  - Deduplicación robusta por id normalizado.
  - `reset()` de estado + desuscripción de listeners.
  - Actualización local de `read_at` al marcar lectura.
- `frontend/src/App.jsx`
  - Reset de store de notificaciones cuando no hay `accessToken` (logout/cambio de sesión).

## 10. Cambios en campana

- `frontend/src/components/NotificationsBell.jsx`
  - Eliminado polling cada 20s.
  - Vista rápida limitada a 10 notificaciones.
  - Footer con acceso `Ver todas`.
  - Mantiene filtros rápidas y marcado masivo.
  - Badge usa `noLeidas` entregado por backend ya filtrado por activas/no expiradas.

## 11. Cambios en página de notificaciones

- `frontend/src/pages/Notificaciones.jsx`
  - Tabla con columnas adicionales de lectura (`read_at`) y acciones.
  - Acción explícita `Marcar leída` por fila.
  - Acción `Abrir` por fila para navegación contextual.
  - Se mantiene consistencia visual con layout/cards/tipografía de la app.

## 12. Cambios de lifecycle/persistencia

- Nuevo campo persistido: `read_at`.
- Regla de retención: 90 días (configurable con `NOTIFICATIONS_RETENTION_DAYS`).
- Purga de antigüedad:
  - ejecución al arranque,
  - ejecución periódica (`NOTIFICATIONS_PURGE_INTERVAL`, default 12h),
  - función explícita `purgarAntiguas()`.
- Conteos/listados excluyen notificaciones fuera de retención.

## 13. Cómo queda preparado para futura PWA

Sin implementar push aún, queda mejor separada la base:

- Evento de negocio -> persistencia notificación -> entrega realtime.
- Eliminada señal redundante de refresh global.
- Lifecycle mínimo establecido (`read_at`, retención, purga).
- Dedupe base para eventos repetitivos.

Siguiente paso recomendado para PWA: introducir capa de orquestación/canales (web socket vs push) sin romper el contrato actual.

## 14. Archivos modificados

- `backend/src/db/models/notificacion.js`
- `backend/src/config/env.js`
- `backend/src/modules/notificaciones/notificaciones.service.js`
- `backend/src/modules/inventario/inventario.service.js`
- `backend/src/server.js`
- `backend/src/modules/dashboard/dashboard.service.js`
- `frontend/src/store/notificacionesStore.js`
- `frontend/src/components/NotificationsBell.jsx`
- `frontend/src/pages/Notificaciones.jsx`
- `frontend/src/App.jsx`

## 15. Pruebas ejecutadas

### Comandos

1. `backend`: `npm test -- src/test/stabilization --runInBand`
2. `frontend`: `npm run build`
3. Runtime API smoke (PowerShell) login/finca/notificaciones/marcar lectura.
4. Runtime socket (Node): emisión única + intento ataque `join:user`.
5. Runtime socket reconexión (Node): intento ataque post-reconnect.
6. Runtime lifecycle (Node en contenedor api): purga de >90 días.
7. Runtime dedupe stock bajo (PowerShell): dos ajustes bajo mínimo.

### Resultados

- Tests estabilización backend: PASS (8 suites, 26 tests).
- Build frontend: PASS.
- API runtime: PASS (creación persistida, lectura y marcado con `read_at`).
- Socket runtime: PASS (`notif:nueva=1`, `notif:refresh=0`, fuga cruzada=0).
- Reconexión socket: PASS (sin fuga tras reconnect).
- Purga lifecycle: PASS (`purgeDeleted=1`, registro antiguo removido).
- Dedupe stock bajo: PASS (1 notificación aunque se repitió trigger).

### Evidencia resumida

- Marcado individual devolvió `read_at` no nulo.
- Ataque previo `join:user` ya no produce eventos ajenos.
- Emisión redundante eliminada (`refresh=0`).
- Retención/purga efectiva sobre registros >90 días.

## 16. Validaciones funcionales runtime

1. Evento real genera notificación persistida: validado con `POST /fincas`.
2. Notificación se entrega una sola vez por socket al usuario correcto: validado.
3. Badge/no leídas actualiza tras `marcarLeida` y `marcarTodas`: validado por API/store.
4. Usuario no recibe notificaciones ajenas por socket: validado con prueba de ataque + reconexión.
5. Página de notificaciones refleja estado de lectura y acciones operativas: validado por build y revisión de contratos UI.

## 17. Riesgos pendientes

- Aún no existe separación completa por canal de entrega (web/push) a nivel de modelo de delivery; esto es siguiente evolución, no bloqueante para esta etapa.
- No se implementó archivado funcional, solo lifecycle mínimo (`read_at` + retención/purga), que era el alcance requerido.
- Persisten otras áreas modificadas históricamente en el repo fuera de esta etapa; no se tocaron para evitar regresiones no relacionadas.

## 18. Confirmación de continuidad hacia Compras

Sí. Con esta estabilización, el sistema de notificaciones y tiempo real queda en estado suficientemente seguro y coherente para continuar con Compras, con las salvedades evolutivas de canalización multi-dispositivo/push para una etapa posterior.
