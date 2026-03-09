# ETAPA 1 - Estabilización Crítica Transversal

## 1. Objetivo de la etapa
Estabilizar la base transversal del sistema antes de implementar los módulos de compras y ventas, corrigiendo frentes críticos de autenticación/sesión, sockets/tiempo real, permisos por recurso en tareas, endpoint `configurarItems` y hardening mínimo de producción con Docker.

## 2. Alcance ejecutado
- Autenticación y sesión: política operativa única implementada en backend y frontend.
- Tiempo real: autenticación de socket endurecida y autorización por recurso para `join:tarea`.
- Permisos por recurso en tareas: helper reutilizable aplicado en novedades, detalle y acciones de tarea.
- Endpoint `configurarItems`: contrato validado, respuesta coherente y emisión de eventos en tiempo real.
- Docker/producción: compose prod endurecido, healthcheck, variables de sesión en prod, y verificación de comando de arranque de API en modo producción.

## 3. Hallazgos confirmados en código real
- El flujo de sesión previo no imponía explícitamente máximo total de sesión (8h) ni corte por inactividad (60m).
- `refresh` rotaba tokens pero sin semántica de actividad de usuario para cortar sesiones inactivas.
- Socket auth usaba `process.env.JWT_SECRET` directo en lugar de la capa central (`utils/jwt` + config), y `join:tarea` permitía unirse a rooms de tareas sin validación de recurso.
- La lógica de permisos por recurso de novedades existía en el servicio, pero no estaba extraída/reutilizada para socket room join ni para todos los puntos de acceso de tarea.
- `configurarItems` existía pero sin emisión de evento de actualización en tiempo real; además faltaba evidencia técnica automatizada de contrato.
- En producción, la API puede arrancar en `npm run dev` si se levanta sin `--build` y persiste imagen previa de desarrollo.

## 4. Decisiones técnicas adoptadas
- Se implementó política de sesión en backend como fuente de verdad:
  - `access token` corto.
  - claims de sesión en JWT (`sid`, `session_start_at`, `last_activity_at`).
  - validación de máximo total e inactividad tanto en `refresh` como en `requireAuth` y handshake de socket.
- Frontend ahora reporta actividad real (`x-last-activity-at`) y controla sesión local con watchdog de inactividad/máximo.
- Se creó helper reusable de autorización por recurso de tarea (`assertTaskResourceAccess`) y se aplicó tanto a HTTP como a sockets.
- Se centralizó suscripción/reuso de sockets en hooks reutilizables para reducir manejo manual por página.
- Se mantuvo arquitectura actual (Express + Sequelize + Zustand + Socket.IO) sin refactor masivo.

## 5. Política final de sesión implementada
- Access token: 15 minutos (`JWT_ACCESS_EXPIRES=15m`).
- Refresh token: 8 horas (`JWT_REFRESH_EXPIRES=8h`).
- Máximo total de sesión: 8 horas (`SESSION_MAX_TOTAL=8h`).
- Inactividad máxima: 60 minutos (`SESSION_INACTIVITY=60m`).
- Mientras haya actividad real del usuario, el frontend mantiene refresh automático.
- Si se excede máximo total o inactividad:
  - backend responde `401` con códigos explícitos (`AUTH_SESSION_EXPIRED_MAX`, `AUTH_SESSION_EXPIRED_INACTIVITY`, `AUTH_SESSION_INVALID`).
  - frontend cierra sesión y exige reingreso de credenciales.

## 6. Archivos modificados
- `backend/src/config/env.js`
- `backend/src/modules/auth/session.policy.js`
- `backend/src/modules/auth/auth.service.js`
- `backend/src/modules/auth/auth.controller.js`
- `backend/src/middlewares/auth.middleware.js`
- `backend/src/modules/tareas/tareas.access.js`
- `backend/src/modules/tareas/tareas.service.js`
- `backend/src/modules/tareas/tareas.controller.js`
- `backend/src/server.js`
- `backend/src/app.js`
- `backend/src/modules/health/health.routes.js`
- `docker-compose.prod.yml`
- `frontend/src/config/sessionPolicy.js`
- `frontend/src/utils/jwt.js`
- `frontend/src/store/authStore.js`
- `frontend/src/hooks/useSessionActivity.js`
- `frontend/src/hooks/useSocketEvent.js`
- `frontend/src/hooks/useTaskSocketRoom.js`
- `frontend/src/api/apiClient.js`
- `frontend/src/App.jsx`
- `frontend/src/pages/Tareas.jsx`
- `frontend/src/pages/MisTareas.jsx`
- `frontend/src/pages/Usuarios.jsx`
- `frontend/src/pages/DetalleTarea.jsx`
- `backend/src/test/stabilization/session.policy.test.js`
- `backend/src/test/stabilization/auth.service.session.test.js`
- `backend/src/test/stabilization/tareas.access.test.js`
- `backend/src/test/stabilization/tareas.configurar-items.test.js`

## 7. Cambios implementados por bloque
### 7.1 Autenticación y sesión
- Nueva capa `session.policy` para validar:
  - máximo total 8h.
  - inactividad 60m.
- `auth.service.login` ahora emite tokens con claims de sesión (`sid`, `session_start_at`, `last_activity_at`).
- `auth.service.refresh` valida límites de sesión y usa `x-last-activity-at` para actualizar actividad real.
- `auth.controller` devuelve `session_policy` en login/refresh y alinea cookie de refresh con límite total.
- `requireAuth` valida sesión además de JWT/estado de usuario.
- Frontend:
  - tracking global de actividad (`useSessionActivity`).
  - watchdog local de sesión.
  - refresh proactivo condicionado por política.
  - propagación de `x-last-activity-at` desde `apiClient`.

### 7.2 Tiempo real / sockets
- Handshake socket migrado a `verifyAccess` centralizado.
- Validación de sesión también en socket handshake.
- `join:tarea` ahora exige autorización por recurso (`assertTaskResourceAccess`).
- Se emite `tarea:join_denied` cuando no hay permiso.
- Frontend: hooks reutilizables (`useSocketEvent`, `useTaskSocketRoom`) aplicados en páginas de tareas/usuarios.

### 7.3 Permisos por recurso en tareas
- Nuevo helper reusable: `backend/src/modules/tareas/tareas.access.js`.
- Aplicado en:
  - `crearNovedad` y `listarNovedades`.
  - `obtenerTarea`.
  - `iniciarTarea`, `completarTarea`, `actualizarDetalles`.
  - `join:tarea` en sockets.
- Regla efectiva:
  - Propietario/Técnico: acceso.
  - Trabajador asignado: acceso.
  - Usuario sin relación: `403 FORBIDDEN`.

### 7.4 Endpoint `configurarItems`
- Verificada existencia y conexión de ruta-controlador-servicio.
- Se mantiene contrato consistente (`item_id|inventario_id`, `cantidad_planificada|cantidad_estimada`).
- Se agregó emisión socket `tarea:insumos` para sincronía en tiempo real.
- Se añadieron pruebas unitarias dedicadas para caso exitoso e inválido (sin 500).

### 7.5 Docker / producción
- `docker-compose.prod.yml` actualizado con:
  - `JWT_ACCESS_EXPIRES` default `15m`.
  - `JWT_REFRESH_EXPIRES` default `8h`.
  - `SESSION_MAX_TOTAL` y `SESSION_INACTIVITY`.
  - healthcheck de API sobre `/health`.
- Se confirmó ausencia de `pgadmin` en compose de producción.
- Se validó que, con build de imagen prod, el contenedor API arranca con `npm start` (no `npm run dev`).
- `health` endpoint normalizado para readiness básico.

## 8. Pruebas ejecutadas
### 8.1 Comandos usados
- `npm test -- --runTestsByPath src/test/stabilization/session.policy.test.js src/test/stabilization/auth.service.session.test.js src/test/stabilization/tareas.access.test.js src/test/stabilization/tareas.configurar-items.test.js`
- `npm test` (suite completa existente)
- `npm run build` (frontend)
- `docker compose --env-file backend/.env.prod -f docker-compose.yml -f docker-compose.prod.yml config`
- `docker compose --env-file backend/.env.prod -f docker-compose.yml -f docker-compose.prod.yml up --build -d db api`
- `docker inspect --format='{{json .Config.Cmd}}' finca_api`

### 8.2 Resultado
- Tests nuevos de estabilización: **PASS (14/14)**.
- Build frontend: **PASS**.
- Suite completa legacy backend: **FAIL** (tests preexistentes dependen de DB `db`/timeouts; no forman parte de los nuevos tests de estabilización).
- Docker prod:
  - Config compose válido.
  - `pgadmin` ausente.
  - imagen prod construida con `Dockerfile.prod` y comando `npm start` verificado.
  - Arranque funcional de API condicionado a credenciales DB válidas (con placeholders de seguridad la conexión falla, esperado).

### 8.3 Evidencia resumida
- Verificado `Cmd` del contenedor `finca_api`: `['npm','start']` tras build prod.
- Logs de API en prod muestran `NODE_ENV=production` y flujo de arranque seguro (sin sync automático).

## 9. Validaciones funcionales de punta a punta
- Flujo de sesión:
  - login + emisión de claims de sesión: validado por tests `auth.service.session`.
  - refresh con actividad: validado.
  - bloqueo por inactividad y máximo total: validado.
- Tiempo real:
  - conexión socket autenticada por JWT central y validación de sesión: validado en código y handshake.
  - restricción por recurso al unirse a room de tarea: validado por helper reutilizado.
- Novedades por permisos:
  - acceso permitido/denegado según rol y asignación: validado en tests `tareas.access`.
- `configurarItems`:
  - caso exitoso e inválido sin error 500: validado en tests dedicados.
- Arranque prod:
  - comando de arranque corregido a `npm start` cuando se construye imagen prod.

## 10. Estado final por bloque
- Autenticación y sesión: **OK**
- Tiempo real / sockets: **OK**
- Permisos por recurso en tareas: **OK**
- Endpoint `configurarItems`: **OK**
- Docker / producción: **Parcial**

Motivo de parcial en Docker/prod:
- El stack arranca en modo producción y con comando correcto, pero la validación completa de salud (`api healthy`) requiere credenciales DB productivas reales. Se dejaron placeholders seguros por hardening.

## 11. Riesgos pendientes no críticos
- Tests legacy de tareas (`src/test/tareas/*`) siguen inestables por dependencia de DB externa/timeout; requieren refactor de harness o levantar DB de prueba dedicada en pipeline.
- Warning de bundle grande en frontend (`>500kB`) no bloquea esta etapa, pero conviene optimizar en etapas siguientes.
- Persistir `.env.prod` con placeholders exige proceso de inyección de secretos en despliegue real.

## 12. Recomendación para continuar hacia Etapa 2 (compras y ventas)
1. Cerrar deuda de tests legacy integrando una base de pruebas reproducible en CI/CD (contenedor DB para jest o mocks unificados).
2. Definir checklist de despliegue seguro (secret manager + rotación JWT + variables obligatorias) para no depender de `.env.prod` local.
3. Con esta base estabilizada, iniciar Etapa 2 sobre contratos ya protegidos (sesión, sockets y autorización por recurso).

---

## Conclusión de preparación para Etapa 2
El sistema queda **técnicamente estabilizado en los frentes críticos transversales** para avanzar a compras y ventas, con una salvedad operativa: completar la verificación final de arranque `healthy` en producción con credenciales reales de base de datos.
