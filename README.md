# Auditoría Técnica Integral (Backend + Frontend + Docker)

Fecha de auditoría: 26 de febrero de 2026  
Alcance: `backend`, `frontend`, `docker-compose*`, autenticación/sesión, tareas, notificaciones y seguridad.

## 1) Resumen ejecutivo

Estado general: **funcional pero con riesgos críticos** en autenticación/sesión, tiempo real por sockets y seguridad de permisos en novedades de tareas.

Prioridades inmediatas:
1. Corregir refresh de sesión (hoy la sesión efectiva expira con el access token).
2. Corregir autenticación de sockets en páginas de tareas.
3. Proteger endpoints de novedades por permisos de tarea.
4. Arreglar endpoint de recursos de tareas (`configurarItems`) que hoy rompe en runtime.
5. Endurecer Docker/seguridad de producción (credenciales y modo ejecución).

## 2) Bugs confirmados

### Críticos

1. Refresh de sesión roto entre frontend y backend.
- Backend en login solo devuelve `access_token` y guarda refresh en cookie httpOnly.
- Frontend espera `refreshToken` en store/localStorage y además usa `withCredentials: false`.
- Resultado: el refresh no funciona y el usuario termina cerrando sesión al vencer el access token.
- Evidencia:
  - `backend/src/modules/auth/auth.controller.js`
  - `frontend/src/store/authStore.js`
  - `frontend/src/api/apiClient.js`

2. Sockets de tareas sin autenticación JWT.
- El servidor Socket.IO exige token (`io.use` con JWT).
- Varias pantallas crean socket directo sin `auth.token`.
- Resultado: conexión rechazada (`UNAUTHORIZED`) y no hay actualizaciones en tiempo real.
- Evidencia:
  - `backend/src/server.js`
  - `frontend/src/pages/Tareas.jsx`
  - `frontend/src/pages/MisTareas.jsx`
  - `frontend/src/pages/DetalleTarea.jsx`

3. Endpoint de recursos de tareas invoca servicio inexistente.
- `controller.configurarItems` llama `service.configurarItems(...)` pero esa función no existe en `tareas.service.js`.
- Resultado: error 500 al intentar guardar recursos desde modal de gestión.
- Evidencia:
  - `backend/src/modules/tareas/tareas.controller.js`
  - `backend/src/modules/tareas/tareas.service.js`

4. Permiso inseguro en novedades de tareas.
- Cualquier usuario autenticado puede crear/listar novedades de cualquier `tarea_id` (sin validar asignación ni rol para esa tarea).
- Resultado: fuga y modificación de información operativa.
- Evidencia:
  - `backend/src/modules/tareas/tareas.routes.js`
  - `backend/src/modules/tareas/tareas.service.js`

### Altos

5. Producción Docker ejecuta `npm run dev`.
- El Dockerfile usa `CMD ["npm","run","dev"]` (nodemon) también para prod.
- Impacto: performance/estabilidad y superficie de ataque innecesaria en producción.
- Evidencia:
  - `backend/Dockerfile`
  - `docker-compose.prod.yml`

6. `pgadmin` expuesto con credenciales por defecto.
- Usuario/clave default visibles y puerto público.
- Impacto: riesgo alto de acceso no autorizado si se despliega así.
- Evidencia:
  - `docker-compose.yml`

7. Frontend muestra edición de detalles para trabajador, pero backend la bloquea.
- UI permite editar en función de estado, no de rol.
- Backend solo permite `Propietario/Tecnico` en `/tareas/:id/detalles`.
- Impacto: UX inconsistente y errores 403 para trabajador.
- Evidencia:
  - `frontend/src/components/tareas/TaskSpecificDetails.jsx`
  - `backend/src/modules/tareas/tareas.routes.js`

8. Filtros de tareas no implementados de extremo a extremo.
- Front envía `tipo_codigo` y `fecha_rango`; backend `listarTareas` no los procesa.
- Impacto: filtros aparentan funcionar en UI pero no filtran realmente.
- Evidencia:
  - `frontend/src/pages/Tareas.jsx`
  - `frontend/src/pages/MisTareas.jsx`
  - `backend/src/modules/tareas/tareas.service.js`

### Medios

9. Paginación inconsistente en “Mis Tareas”.
- Backend retorna `total`; frontend busca `totalItems`.
- Impacto: conteos/paginación incorrecta.
- Evidencia:
  - `frontend/src/pages/MisTareas.jsx`
  - `backend/src/modules/tareas/tareas.service.js`

10. Logs de debug en rutas de reportes.
- `console.log(requireRole);` en route file.
- Impacto: ruido en logs y posible fuga de contexto interno.
- Evidencia:
  - `backend/src/modules/reportes/reportes.routes.js`

11. Comando de tests backend no portable en Windows.
- Script usa `NODE_ENV=test ...` estilo Unix.
- Impacto: falla de CI/local en Windows.
- Evidencia:
  - `backend/package.json`

## 3) Potenciales bugs / deuda técnica relevante

1. Validación incompleta de asignados.
- En creación/asignación de tareas no se valida de forma estricta que todos los IDs existan/estén activos; algunos inválidos pueden ignorarse sin error claro.
- Evidencia:
  - `backend/src/modules/tareas/tareas.service.js`

2. Validación débil de `tipo_codigo` al crear tarea.
- Si llega vacío puede terminar en error interno al hacer `toLowerCase`.
- Evidencia:
  - `backend/src/modules/tareas/tareas.service.js`

3. Conexión DB no corta arranque en fallo.
- `db.connect()` captura y loguea error, pero no aborta proceso.
- Evidencia:
  - `backend/src/db/index.js`

4. Notificaciones no homogéneas en tiempo real.
- Solo flujos que usan `crearYEmitir` emiten socket; `crear` y `crearParaRoles` no emiten.
- Impacto: algunas notificaciones aparecen solo por polling o recarga.
- Evidencia:
  - `backend/src/modules/notificaciones/notificaciones.service.js`
  - `backend/src/modules/fincas/fincas.service.js`
  - `backend/src/modules/cosechas/cosechas.service.js`
  - `backend/src/modules/lotes/lotes.services.js`
  - `backend/src/modules/pagos/pagos.service.js`

5. Calidad de código frontend con deuda significativa.
- `npm run lint` reporta 35 errores y 25 warnings.

## 4) Errores observados al ejecutar

1. `frontend` lint falla con múltiples errores (`no-unused-vars`, `no-empty`, hooks deps).
2. `backend` tests:
- `npm test` falla en Windows por script no portable.
- `jest` manual falla por host DB `db` no resolvible fuera de Docker (`ENOTFOUND db`) y timeouts en hooks.

## 5) Duración de sesión del usuario (estado real)

Configuración:
- `backend/.env.dev`: `JWT_ACCESS_EXPIRES=60m`, `JWT_REFRESH_EXPIRES=7d`
- `backend/.env.prod`: `JWT_ACCESS_EXPIRES=15m`, `JWT_REFRESH_EXPIRES=7d`

Comportamiento esperado:
- Access token corto + refresh token rotado para extender sesión hasta 7 días.

Comportamiento actual efectivo (con el frontend actual):
- **Dev: ~60 minutos**
- **Prod: ~15 minutos**
- Motivo: refresh no se ejecuta correctamente por incompatibilidad cookie/body y `withCredentials: false`.

## 6) Seguridad del sistema (hallazgos)

Fortalezas:
1. JWT en middleware de auth.
2. `helmet`, `rate-limit`, CORS configurado.
3. Validación de usuario activo en `requireAuth`.
4. Tokens con expiración corta de access.

Riesgos:
1. Credenciales por defecto en Docker (`postgres/postgres`, `pgadmin admin123`) y secretos en archivos `.env*`.
2. CORS en development demasiado permisivo (acepta cualquier origin).
3. Rate limits muy altos para login en estado actual.
4. Endpoint de novedades sin control de autorización por recurso (riesgo de acceso horizontal).
5. Producción corriendo modo `dev` en contenedor.

## 7) Cómo funciona actualmente el apartado de tareas

Flujo principal:
1. Crear tarea (`POST /tareas`) por `Propietario/Tecnico`.
2. Estado inicial:
- `Pendiente` si no hay asignados.
- `Asignada` si se asignan usuarios.
3. Iniciar (`POST /tareas/:id/iniciar`):
- Trabajador asignado o supervisor.
- Estado pasa a `En progreso`.
4. Completar (`POST /tareas/:id/completar`):
- Guarda detalle real e insumos reales.
- Estado pasa a `Completada`.
5. Verificar (`POST /tareas/:id/verificar`):
- Solo `Propietario/Tecnico`.
- Aplica consumo definitivo de inventario.
- Estado pasa a `Verificada`.
6. Cancelar (`POST /tareas/:id/cancelar`):
- `Propietario/Tecnico`.
- Estado pasa a `Cancelada`.

Edición de tareas:
1. Asignaciones: `PATCH /tareas/:id/asignaciones`.
2. Detalles técnicos (principalmente cosecha): `PATCH /tareas/:id/detalles`.
3. Recursos/ítems: endpoint existe en ruta/controlador, pero hoy está roto por falta de implementación en servicio.

## 8) Comportamiento de notificaciones (actual)

Backend:
1. Crea registros en tabla `notificaciones`.
2. Cuando usa `crearYEmitir`, emite:
- `notif:nueva`
- `notif:refresh`
3. Cuando usa `crear` / `crearParaRoles`, no emite socket en vivo.

Frontend:
1. Campana usa store con socket + polling cada 20s.
2. Muestra badge de no leídas y toast cuando sube contador.
3. Click en notificación de tipo `Tarea` navega a detalle de tarea.
4. En la página de notificaciones, tipos no `Tarea` no tienen navegación específica implementada.

## 9) Backlog recomendado (orden de ejecución)

### Fase 1 (crítico, inmediato)
1. Unificar estrategia de refresh:
- Opción A: cookie httpOnly + `withCredentials: true`.
- Opción B: refresh token en body/store (menos recomendable).
2. Mover todas las conexiones socket a `frontend/src/lib/socket.js` con JWT.
3. Implementar `configurarItems` en `tareas.service.js`.
4. Restringir novedades por permisos de tarea (asignado o supervisor autorizado).
5. Endurecer Docker prod:
- quitar `pgadmin` de prod.
- usar `npm start` en imagen prod.
- rotar credenciales/secrets.

### Fase 2 (alta)
1. Corregir filtros de tareas (`tipo_codigo`, `fecha_rango`) en backend o ajustar frontend.
2. Alinear paginación de `MisTareas` (`total` vs `totalItems`).
3. Corregir UI de edición para rol trabajador en detalles.
4. Estandarizar notificaciones en tiempo real para módulos no-tareas.

### Fase 3 (calidad y estabilidad)
1. Dejar lint en 0 errores.
2. Arreglar tests para ejecución local y Docker.
3. Quitar logs debug y duplicados de funciones.
4. Revisar `rate-limit` y políticas CORS para entorno productivo real.
