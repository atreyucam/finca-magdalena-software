# Auditoria tecnica inventario-tareas para preparar compras y ventas

## 1. Resumen ejecutivo

El sistema actual tiene un acoplamiento estructural fuerte a `lote` y `fecha_vencimiento` en inventario, tareas y reportes. La simplificacion funcional solicitada (eliminar lote/vencimiento/formulacion/ingrediente activo y simplificar cosecha) no es un ajuste cosmetico: implica cambios de dominio, contratos API, formularios frontend, consultas SQL de reportes y trazabilidad historica.

Hallazgo clave: el endpoint `configurarItems` de tareas hoy **no esta roto**; existe y tiene servicio conectado. El problema principal no es ese endpoint sino la amplitud del impacto cruzado del cambio de dominio.

Recomendacion principal: aplicar **limpieza progresiva controlada** (fase de compatibilidad + migracion + corte), no limpieza fisica directa en un solo paso.

## 2. Estado actual del modulo de inventario

### 2.1 Backend

- Modelo principal: `InventarioItem` con `nombre`, `categoria`, `unidad_id`, `stock_actual`, `stock_minimo`, `activo`, `meta` JSONB.
  - Evidencia: `backend/src/db/models/inventarioItem.js`.
- `meta` guarda campos de insumo actualmente vivos en API/UI: `ingrediente_activo`, `formulacion`, `proveedor`.
  - Evidencia: `backend/src/modules/inventario/inventario.service.js:201-205`, `:289-293`.
- Modelo `InventarioLote` activo y central para FEFO con `codigo_lote_proveedor`, `fecha_vencimiento`, `cantidad_actual`.
  - Evidencia: `backend/src/db/models/inventarioLote.js`.
- `moverStock` usa logica FEFO para salidas de insumo y exige `fecha_vencimiento` en entradas de insumo.
  - Evidencia: `backend/src/modules/inventario/inventario.service.js:65-69`, `:121-147`.
- Movimientos incluyen `lote_id`.
  - Evidencia: `backend/src/db/models/inventarioMovimiento.js`, `backend/src/modules/inventario/inventario.service.js:156-159`.
- Endpoints lot-dependent activos:
  - `PATCH /inventario/lotes/:loteId`
  - `GET /inventario/items/:id/lotes/buscar`
  - Evidencia: `backend/src/modules/inventario/inventario.routes.js:31`, `:41`.

### 2.2 Frontend

- Pantalla inventario mantiene columna y modal de lotes, mas edicion de lote.
  - Evidencia: `frontend/src/components/inventario/VistaInventario.jsx`.
- Formulario de item (insumo) pide ingrediente activo, formulacion, fabricante y lote inicial con vencimiento.
  - Evidencia: `frontend/src/components/inventario/FormularioItem.jsx`.
- Ajuste de stock para insumo entrada exige lote y vencimiento, y valida lote existente.
  - Evidencia: `frontend/src/components/inventario/FormularioAjuste.jsx`.
- Historial muestra columna `Lote`.
  - Evidencia: `frontend/src/components/inventario/VistaHistorial.jsx`.

## 3. Estado actual del modulo de tareas

### 3.1 Backend

- `Tarea` depende de `lote_id` y `cosecha_id` obligatorios.
  - Evidencia: `backend/src/db/models/tarea.js`.
- Creacion de tarea exige `lote_id` + `cosecha_id` y valida consistencia finca-lote-cosecha.
  - Evidencia: `backend/src/modules/tareas/tareas.service.js:500-518`.
- `detalles` JSONB de cosecha hoy incluye:
  - `kg_planificados`, `kg_cosechados`
  - `clasificacion`, `rechazos`
  - `entrega` (centro, gabetas entregadas/devueltas/netas)
  - `liquidacion`, `total_dinero`
  - Evidencia: `backend/src/modules/tareas/tareas.service.js:442-476`.
- Consumo de insumos en completar/verificar permite `lote_insumo_manual`.
  - Evidencia: `backend/src/modules/tareas/tareas.service.js:723`, `:882-883`.
- Verificacion de tarea descuenta inventario y referencia movimiento con `lote_id` de tarea.
  - Evidencia: `backend/src/modules/tareas/tareas.service.js:934`.

### 3.2 Frontend

- Creacion de tarea obliga seleccion de lote y cosecha.
  - Evidencia: `frontend/src/components/CrearTareaModal.jsx`.
- Listados de tareas (admin y trabajador) filtran y muestran lote.
  - Evidencia: `frontend/src/pages/Tareas.jsx`, `frontend/src/pages/MisTareas.jsx`.
- Detalle de tarea muestra lote de tarea y lote manual de insumos.
  - Evidencia: `frontend/src/pages/DetalleTarea.jsx`.
- UI de cosecha en detalle de tarea tiene tres bloques avanzados activos:
  - clasificacion/rechazo
  - logistica (`entrega`)
  - liquidacion financiera
  - Evidencia: `frontend/src/components/tareas/TaskSpecificDetails.jsx`.
- Modal completar/verificar todavia usa campos de cosecha extra (maduracion, higiene, resumen de entrega y total dinero).
  - Evidencia: `frontend/src/components/CompletarVerificarTareaModal.jsx`.

## 4. Modelos y relaciones involucradas

Modelos directos:

- `InventarioItem`
- `InventarioLote`
- `InventarioMovimiento`
- `Tarea`
- `TareaItem`
- `Lote`
- `Cosecha`
- `PeriodoCosecha`

Relaciones relevantes:

- `InventarioItem 1:N InventarioLote`
- `InventarioLote 1:N InventarioMovimiento`
- `Tarea 1:N TareaItem`
- `TareaItem N:1 InventarioItem`
- `Tarea N:1 Lote`
- `Tarea N:1 Cosecha`

Evidencia: `backend/src/db/index.js:137-158` y asociaciones de tareas/lotes/cosechas.

## 5. Dependencias actuales de lote y campos asociados

Dependencias confirmadas de `lote` / `fecha_vencimiento` / campos a eliminar:

- Inventario backend:
  - FEFO en `moverStock` con lotes activos y orden por vencimiento.
  - Edicion/busqueda de lote dedicadas.
- Inventario frontend:
  - Tabla con columna lotes.
  - Modales para detalle/edicion lote.
  - Ajustes con validacion de lote.
  - Formulario item con campos `ingrediente_activo`, `formulacion`, `proveedor`, lote inicial.
- Tareas backend/frontend:
  - `Tarea.lote_id` obligatorio y usado en filtros, mensajes, referencias de movimiento.
  - `TareaItem.lote_insumo_manual` visible/editable.
- Reportes:
  - Inventario FEFO (`/reportes/inventario/fefo`) basado en `inventario_lotes`.
  - Produccion y comparativas agrupan por `lote_id` y consumen `entrega`, `liquidacion`, `total_dinero`, `kg_cosechados` en JSONB.
  - Evidencia: `backend/src/modules/reportes/reportes.routes.js`, `backend/src/modules/reportes/reportes.service.js`.
- Frontend reportes:
  - Panel de inventario muestra tabla FEFO (lote/vencimiento).
  - Panel de produccion muestra KPIs/logistica/$total y tablas por lote.
  - Evidencia: `frontend/src/components/reportes/panels/InventarioResumenPanel.jsx`, `frontend/src/components/reportes/panels/ProduccionPanel.jsx`.

## 6. Impacto tecnico de eliminar lote, fecha de vencimiento, ingrediente activo y formulacion

### 6.1 Lote y fecha de vencimiento

Impacto alto en:

- Modelo/servicio de inventario (FEFO y ajuste de entradas/salidas).
- Endpoints lot-specific (`editarLote`, `buscarLote`).
- DTOs de listado de items y movimientos.
- Tareas (referencias a `lote_id` en creacion, filtros, notificaciones, verificacion).
- Reportes inventario y produccion.
- Frontend inventario/tareas/reportes.

### 6.2 Ingrediente activo y formulacion

Impacto medio:

- Actualmente viven en `InventarioItem.meta` y se exponen en APIs y UI de insumos.
- Eliminarlos no rompe integridad relacional, pero si rompe formularios, tablas y filtros que los muestran.

### 6.3 Fabricante (proveedor)

- Campo tambien vive en `meta`.
- Debe mantenerse para insumos segun nueva regla funcional.
- Requiere endurecer contrato para que solo insumos lo usen.

## 7. Impacto tecnico de simplificar cosecha

Cambio objetivo: dejar cosecha solo con `clasificacion` (exportacion/nacional/rechazo), `numero de gavetas` y `total de gavetas`.

Impacto confirmado:

- Backend tareas:
  - Sanitizadores y normalizadores de `liquidacion`/`entrega`/`total_dinero` deben retirarse o degradarse.
  - `actualizarDetalles`, `completarTarea`, `verificarTarea` tienen ramas activas de esos campos.
- Frontend tareas:
  - `TaskSpecificDetails` debe eliminar `LogisticsManager` y `SettlementManager`.
  - `CompletarVerificarTareaModal` debe dejar de pedir/mostrar resumen de logistica y total dinero.
  - `FormularioDetalleActividad` para cosecha debe pasar de `kg_planificados + grado` al nuevo set funcional.
- Reportes produccion:
  - KPI dinero, logistica y eventos con centro acopio quedan invalidos si se elimina del dominio.

## 8. Paginas y componentes frontend afectados

Inventario (directo):

- `frontend/src/pages/Inventario.jsx`
- `frontend/src/components/inventario/VistaInventario.jsx`
- `frontend/src/components/inventario/FormularioItem.jsx`
- `frontend/src/components/inventario/FormularioAjuste.jsx`
- `frontend/src/components/inventario/FormularioEditarLote.jsx`
- `frontend/src/components/inventario/VistaHistorial.jsx`

Tareas (directo):

- `frontend/src/pages/Tareas.jsx`
- `frontend/src/pages/MisTareas.jsx`
- `frontend/src/pages/DetalleTarea.jsx`
- `frontend/src/components/CrearTareaModal.jsx`
- `frontend/src/components/GestionarItemsTareaModal.jsx`
- `frontend/src/components/CompletarVerificarTareaModal.jsx`
- `frontend/src/components/tareas/TaskSpecificDetails.jsx`
- `frontend/src/components/FormularioDetalleActividad.jsx`

Navegacion/UI:

- `frontend/src/layouts/OwnerLayout.jsx`
- `frontend/src/layouts/TechLayout.jsx`
- `frontend/src/components/MenuLateral.jsx`
- `frontend/src/routes/AppRouter.jsx`
- `frontend/src/components/app/AppTitle.jsx`

Impacto colateral (si se limpia dominio de verdad):

- `frontend/src/components/reportes/panels/InventarioResumenPanel.jsx`
- `frontend/src/components/reportes/panels/ProduccionPanel.jsx`

## 9. Impacto en contratos API

### 9.1 Inventario

Cambios requeridos:

- `POST /inventario/items`:
  - quitar `lote_inicial`, `ingrediente_activo`, `formulacion`.
  - mantener `proveedor` solo para insumo.
- `POST /inventario/items/:id/ajustes`:
  - quitar `datos_lote` en nuevo contrato simplificado.
- `GET /inventario/items`:
  - dejar de retornar `lotes`, `ingrediente_activo`, `formulacion`.
- `GET /inventario/movimientos`:
  - `lote` quedaria obsoleto o deprecado.
- retirar/deprecar:
  - `PATCH /inventario/lotes/:loteId`
  - `GET /inventario/items/:id/lotes/buscar`

### 9.2 Tareas

Cambios requeridos:

- `POST /tareas`:
  - revisar obligatoriedad de `lote_id` segun nuevo modelo operativo.
- `PATCH /tareas/:id/detalles`, `POST /:id/completar`, `POST /:id/verificar`:
  - retirar `entrega`, `liquidacion`, `total_dinero`, campos legacy de cosecha no deseados.
  - simplificar payload de cosecha a clasificacion/gavetas/total.
- `GET /tareas` y `GET /tareas/:id`:
  - revisar campos de lote en respuesta si se elimina dependencia.

### 9.3 Endpoint `configurarItems`

Estado actual confirmado:

- Ruta: `POST /tareas/:id/items`
- Controlador y servicio existen y funcionan.
- Acepta `item_id` o `inventario_id` y valida payload.
- Evidencia adicional: test de estabilizacion `backend/src/test/stabilization/tareas.configurar-items.test.js`.

## 10. Riesgos de limpiar modelos de verdad

Riesgos altos:

1. Romper FEFO y trazabilidad historica de inventario si se elimina `InventarioLote` sin estrategia de transicion.
2. Romper reportes productivos y dashboard (inventario FEFO, logistica, total dinero, comparativas por lote).
3. Romper creacion/listado de tareas por dependencia actual de `lote_id`.
4. Inconsistencias frontend/backend temporales en payloads JSONB de cosecha.

Riesgos medios:

1. Deuda tecnica por uso intensivo de `detalles` JSONB sin versionado de esquema.
2. Falta de capa formal de migraciones (se usa `sequelize.sync({ alter: true })` en desarrollo) complica despliegue seguro de cambios fisicos.
   - Evidencia: `backend/src/db/index.js:200-203`, `backend/src/server.js:28-31`.
3. Inconsistencia potencial en modelo `Tarea.periodo_id` (`allowNull: false`) vs servicio que asigna `null` cuando no viene periodo.
   - Evidencia: `backend/src/db/models/tarea.js`, `backend/src/modules/tareas/tareas.service.js:547`.

## 11. Recomendacion tecnica: limpieza progresiva vs limpieza directa

Recomendacion: **limpieza progresiva**.

### Fase A (compatibilidad)

- Mantener tablas/campos actuales, introducir contratos v2 simplificados.
- Marcar endpoints/campos legacy como deprecados.
- Ajustar frontend para consumir v2 sin lote.

### Fase B (migracion funcional)

- Migrar UI tareas/inventario y reportes al nuevo dominio.
- Congelar escritura de campos legacy (`lote`, `liquidacion`, `entrega`) en nuevas operaciones.

### Fase C (limpieza fisica)

- Ejecutar migraciones SQL versionadas para retirar columnas/tablas legacy.
- Eliminar codigo muerto en backend/frontend.

No recomendado: limpieza directa en un solo release porque el impacto es transversal y alto.

## 12. Propuesta de ubicacion de compras y ventas en sidebar

Estado actual:

- Owner/Tech usan menu plano con `Dashboard`, `Tareas`, `Inventario`, etc.
  - Evidencia: `frontend/src/layouts/OwnerLayout.jsx`, `frontend/src/layouts/TechLayout.jsx`.

Propuesta:

- Insertar `Compras` y `Ventas` inmediatamente despues de `Inventario` para coherencia de flujo operativo.
- Orden sugerido Owner:
  - Dashboard
  - Tareas
  - Inventario
  - Compras
  - Ventas
  - Produccion
  - Usuarios
  - Pagos
  - Reportes
  - Notificaciones
- Orden sugerido Tech:
  - Dashboard
  - Tareas
  - Inventario
  - Compras
  - Ventas (si su rol lo permite)
  - Usuarios
  - Pagos
  - Metricas
  - Notificaciones

Cambios UI tecnicos requeridos para esto:

- `MenuLateral` (diccionario iconos y labels)
- `OwnerLayout` / `TechLayout` (items de navegacion)
- `AppRouter` (rutas)
- `AppTitle` (titulos por ruta)

## 13. Recomendacion de consistencia UI para compras y ventas

Patrones actuales a respetar:

- Layout general: card principal, filtros tipo chips/select, tablas con `Tabla*` shared components.
- Flujo modal: alta/edicion en modal grande, acciones principales a la derecha.
- Estado visual: badges por estado, paginador comun, look & feel blanco/slate con acentos semanticos.

Para compras (futuro) mantener consistencia con:

- Lista principal tipo inventario/tareas (filtros + tabla + paginacion).
- Detalle de factura en modal/pagina con seccion de items y totales calculados.
- Reuso de componentes UI existentes (`Tabla`, `Boton`, `Input`, `Select`, `Badge`, `VentanaModal`).

Para ventas (futuro) replicar mismo patron de navegacion y estructura visual para evitar ruptura cognitiva.

## 14. Orden recomendado de implementacion

1. Congelar y versionar contratos API de inventario/tareas (v1 legacy + v2 simplificado).
2. Refactor backend inventario (sin FEFO/lote en flujo nuevo) manteniendo compat temporal.
3. Refactor backend cosecha en tareas (quitar logistica/liquidacion del flujo nuevo).
4. Ajustar frontend inventario (tablas/formularios sin lote ni campos eliminados).
5. Ajustar frontend tareas (crear/completar/verificar/detalle cosecha simplificados).
6. Ajustar reportes/dashboard a nuevo dominio (sin romper KPI criticos).
7. Ejecutar migraciones fisicas finales y eliminar legacy.
8. Recien despues iniciar implementacion de modulo compras, luego ventas.

## 15. Conclusion para la siguiente etapa

El sistema **todavia no esta listo** para arrancar implementacion directa de compras/ventas sin antes ejecutar una refactorizacion controlada del dominio inventario-tareas.

Si se aplica el plan progresivo propuesto, la base quedara coherente para:

- crear compras con impacto de stock estable,
- evitar contratos duplicados/ambiguos,
- y disenar ventas sobre un dominio limpio y consistente.

Sin esta limpieza previa, compras/ventas heredarian deuda funcional y alta probabilidad de regresiones en reportes y trazabilidad.
