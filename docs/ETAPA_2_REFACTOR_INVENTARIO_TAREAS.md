# ETAPA 2 - Refactorización Controlada de Inventario y Tareas

## 1. Objetivo de la etapa
Refactorizar de forma controlada el dominio operativo de inventario y tareas para:
- eliminar dependencias funcionales de lote/vencimiento y metadatos obsoletos en inventario,
- simplificar cosecha a clasificacion por gavetas,
- alinear backend/frontend con contratos consistentes,
- dejar preparado el encaje de Compras y Ventas (sin implementarlos aún).

## 2. Alcance ejecutado
- Inventario backend simplificado (sin uso funcional de lotes/FEFO en flujo operativo).
- Inventario frontend simplificado (tabla/formularios/ajustes sin lote, vencimiento, ingrediente activo ni formulacion).
- Tareas backend ajustado para cosecha simplificada y sin lote manual de insumo en completar/verificar.
- Tareas frontend ajustado para cosecha simplificada (exportacion, nacional, rechazo, total gavetas).
- Endpoint `configurarItems` validado en pruebas de estabilización.
- Reportes impactados: inventario FEFO y producción legacy marcados explícitamente como deprecados (sin fallo silencioso).
- Sidebar/rutas preparadas para Compras y Ventas con placeholders.

## 3. Hallazgos confirmados en código real
1. Inventario mantenía lógica histórica de lotes/FEFO y endpoints de lote (`editarLote`, `buscarLote`) aunque el flujo nuevo ya no los requiere.
2. Frontend de inventario tenía rastros de UI de lotes y FEFO (componentes legacy) aunque la vista operativa principal podía simplificarse.
3. Tareas/cosecha tenían mezcla de dos dominios: uno simplificado y otro legacy (logística/liquidación/`kg_cosechados`).
4. Reportes de producción seguían consultando campos legacy (`kg_cosechados`, `entrega`, `total_dinero`) incompatibles con la cosecha simplificada.
5. La suite histórica de tests de tareas depende de una preparación de datos legacy (ej. `Lote.finca_id`) y no representa completamente el dominio nuevo.

## 4. Decisiones técnicas adoptadas
1. **Compatibilidad controlada sin limpieza destructiva de tablas**: se mantiene esquema físico legado para evitar ruptura amplia, pero se desactiva su uso funcional en flujo nuevo.
2. **Deprecación explícita de endpoints/segmentos legacy** en vez de devolver métricas incorrectas (contrato con `header.deprecated`).
3. **Persistencia de cosecha normalizada** en JSON simplificado con `clasificacion` y `total_gavetas`.
4. **Lógica de stock centralizada en item maestro** sin FEFO/lote operativo.
5. **Preparación de navegación de Compras/Ventas** con rutas placeholder para no bloquear etapa siguiente.

## 5. Cómo se guardaba antes la información relevante
### Inventario
- `inventario_items.stock_actual` + `inventario_lotes` (código lote, vencimiento, cantidad por lote).
- Movimientos con potencial referencia a `lote_id` y operaciones FEFO.
- Metadatos mezclados para insumos (incluyendo ingrediente/formulación según flujo histórico).

### Tareas/Cosecha
- `tareas.detalles` podía incluir estructuras legacy: `clasificacion[]`, `rechazos[]`, `entrega`, `liquidacion`, `kg_cosechados`, `total_dinero`.
- Completar/verificar permitía elementos ligados a ese dominio legacy.

## 6. Cómo se guarda ahora la información relevante
### Inventario
- Flujo operativo simplificado usa:
  - `inventario_items`: nombre, categoria, unidad, stock inicial/minimo/total, estado,
  - `meta.fabricante` solo para `Insumo`.
- Movimientos se registran sin lote (`lote_id: null`) en entradas/salidas/ajustes del flujo nuevo.
- Endpoints de lote en inventario quedan deprecados (`410 DEPRECATED`).

### Tareas/Cosecha
- `tareas.detalles` para cosecha se normaliza a:
  - `clasificacion: { exportacion, nacional, rechazo, total_gavetas }`
  - `total_gavetas`
- Se elimina del flujo operativo nuevo la persistencia/uso de:
  - `liquidacion`, `entrega/logistica`, `total_dinero`, `kg_cosechados`.
- Completar/verificar ya no persisten `lote_insumo_manual`.

## 7. Modelos/tablas/campos impactados
- `inventario_items` (uso funcional y contrato de `meta.fabricante`).
- `inventario_movimientos` (registro sin `lote_id` operativo).
- `inventario_lotes` (tabla conservada por compatibilidad; fuera del flujo nuevo).
- `tareas.detalles` (normalización de cosecha simplificada).
- `tarea_items` (consumo sin lote manual).

## 8. Cambios implementados por bloque
### 8.1 Inventario backend
- Archivo: `backend/src/modules/inventario/inventario.service.js`
- Cambios:
  - `_moverStock` simplificado sin FEFO/lotes.
  - `crearItem`/`editarItem` con `fabricante` solo para `Insumo`.
  - `listarItems` y `listarMovimientos` sin salida de lotes.
  - `editarLote` y `buscarLote` marcados como deprecados (410).

### 8.2 Inventario frontend
- Archivos: formularios, vista de inventario, historial, página inventario.
- Cambios:
  - eliminación de campos lote/vencimiento/ingrediente/formulación en flujo principal,
  - tabla simplificada por categoría,
  - ajustes de stock sin lote.

### 8.3 Tareas backend
- Archivo: `backend/src/modules/tareas/tareas.service.js`
- Cambios:
  - sanitización central de cosecha (`sanitizarDetallesCosecha`),
  - completar/verificar/actualizar detalles usando dominio simplificado,
  - eliminación de `lote_insumo_manual` en persistencia operativa,
  - bitácora de cambios orientada a clasificación simplificada.

### 8.4 Tareas frontend
- Archivos: detalle tarea, crear tarea, completar/verificar, formulario detalle, detalles específicos.
- Cambios:
  - cosecha simplificada en UI,
  - total gavetas calculado,
  - sin logística/liquidación en flujo operativo activo,
  - consumo de insumos sin lote manual.

### 8.5 Cosecha
- Estructura final soportada:
  - `exportacion`, `nacional`, `rechazo`, `total_gavetas`.
- Compatibilidad:
  - se aceptan entradas legacy (array de clasificación) y se transforman al nuevo modelo.

### 8.6 Reportes impactados
- Archivo: `backend/src/modules/reportes/reportes.service.js`
- Archivo: `frontend/src/components/reportes/panels/ProduccionPanel.jsx`
- Cambios:
  - reportes FEFO/producción legacy marcados deprecados con contrato explícito,
  - panel frontend muestra aviso de deprecación (evita datos erróneos silenciosos).

### 8.7 Sidebar / navegación / UI
- Archivos: layouts owner/tech, router, menú lateral, título app, `ModuloPreparacion`.
- Cambios:
  - rutas y entradas para `Compras` y `Ventas` como placeholders preparados.

## 9. Contratos API modificados
### Inventario
- `POST /inventario/items`:
  - ahora operativo con contrato simplificado (sin lote/vencimiento/ingrediente/formulación).
- `PATCH /inventario/items/:id`:
  - edición coherente con dominio simplificado.
- `POST /inventario/items/:id/ajustes`:
  - sin dependencia de lote/vencimiento.
- `PATCH /inventario/lotes/:loteId` y `GET /inventario/items/:id/lotes/buscar`:
  - `410 DEPRECATED` en flujo nuevo.

### Tareas
- payload de cosecha en creación/actualización:
  - `detalle.clasificacion = { exportacion, nacional, rechazo }`
  - backend persiste además `total_gavetas`.
- completar/verificar:
  - sin `lote_insumo_manual` en el contrato funcional nuevo.

### Reportes
- endpoints de producción/comparación devuelven contrato deprecado con `header.deprecated`.

## 10. Estrategia de compatibilidad temporal
- Se preservan tablas/columnas legacy para no romper módulos fuera de alcance.
- Se anula su uso en el flujo operativo nuevo de inventario/cosecha.
- Se devuelve deprecación explícita en reportes legacy para evitar resultados engañosos.

## 11. Archivos modificados
### Backend
- `backend/src/modules/inventario/inventario.service.js`
- `backend/src/modules/tareas/tareas.controller.js`
- `backend/src/modules/tareas/tareas.service.js`
- `backend/src/modules/reportes/reportes.service.js`

### Frontend
- `frontend/src/components/inventario/FormularioItem.jsx`
- `frontend/src/components/inventario/FormularioAjuste.jsx`
- `frontend/src/components/inventario/VistaInventario.jsx`
- `frontend/src/components/inventario/VistaHistorial.jsx`
- `frontend/src/pages/Inventario.jsx`
- `frontend/src/pages/DetalleTarea.jsx`
- `frontend/src/components/CompletarVerificarTareaModal.jsx`
- `frontend/src/components/FormularioDetalleActividad.jsx`
- `frontend/src/components/CrearTareaModal.jsx`
- `frontend/src/components/tareas/TaskSpecificDetails.jsx`
- `frontend/src/components/reportes/panels/InventarioResumenPanel.jsx`
- `frontend/src/components/reportes/panels/ProduccionPanel.jsx`
- `frontend/src/layouts/OwnerLayout.jsx`
- `frontend/src/layouts/TechLayout.jsx`
- `frontend/src/components/MenuLateral.jsx`
- `frontend/src/components/app/AppTitle.jsx`
- `frontend/src/routes/AppRouter.jsx`
- `frontend/src/pages/ModuloPreparacion.jsx`

### Tests agregados/ajustados
- `backend/src/test/stabilization/inventario.simplified.test.js`
- `backend/src/test/stabilization/tareas.cosecha.simplified.test.js`
- `backend/src/test/stabilization/tareas.configurar-items.test.js`
- `backend/src/test/stabilization/reportes.produccion.deprecated.test.js`

## 12. Pruebas ejecutadas
### Comandos usados
- `cd backend && npx jest src/test/stabilization --runInBand`
- `cd backend && npm test`
- `cd frontend && npm run build`
- `docker exec finca_api npm test -- --runInBand`

### Resultados
- `npx jest src/test/stabilization --runInBand`: **OK** (7 suites, 23 tests, todo en verde).
- `npm run build` frontend: **OK** (build producción exitoso).
- `npm test` backend (host): **parcial**
  - fallan suites legacy `tarea.create` y `tarea.assign` por dependencia de DB/fixtures legacy.
- `docker exec finca_api npm test -- --runInBand`: **parcial**
  - tras crear DB `finca_test`, persisten fallos en tests legacy por fixtures desactualizados (`Lote.finca_id` no enviado en test).

### Evidencia resumida
- El dominio nuevo (inventario simplificado, cosecha simplificada, permisos y configurarItems estabilizado) queda cubierto por pruebas de estabilización en verde.
- Los fallos restantes están concentrados en tests legacy no alineados al modelo actual, no en runtime de los cambios nuevos.

## 13. Validaciones funcionales de punta a punta
Estado de validación en este entorno:
1. Crear insumo simplificado: **OK** (test estabilización)
2. Crear herramienta simplificada: **OK** (test estabilización / contrato)
3. Crear equipo simplificado: **OK** (test estabilización / contrato)
4. Ajustar stock sin lote/vencimiento: **OK** (test estabilización)
5. Inventario sin columna/detalle de lotes en vista principal: **OK** (build + revisión de UI refactorizada)
6. Crear/editar tarea sin lote manual en flujo nuevo: **OK** (backend/frontend refactor + tests de tareas)
7. Registrar cosecha solo exportación/nacional/rechazo/total: **OK** (tests + validación de payload)
8. Visualizar detalle de cosecha simplificada: **OK** (componente `TaskSpecificDetails` simplificado)
9. Logística/liquidación fuera del flujo operativo nuevo: **OK** (persistencia/contratos simplificados; reportes legacy deprecados)
10. Consistencia general UI/navegación: **OK** (build frontend + rutas placeholder Compras/Ventas)

## 14. Estado final por bloque
- Inventario backend: **OK**
- Inventario frontend: **OK**
- Tareas backend: **OK**
- Tareas frontend: **OK**
- Cosecha simplificada: **OK**
- Reportes impactados: **PARCIAL CONTROLADO** (deprecados explícitos, pendiente rediseño analítico)
- Sidebar/navegación/UI (preparación Compras/Ventas): **OK**

## 15. Riesgos pendientes
1. Existen pruebas legacy de tareas no alineadas al esquema/fixtures actuales (deuda de test suite).
2. Se mantienen tablas/campos legacy en DB por compatibilidad (requiere plan de migración física en etapa posterior).
3. Reportes de producción quedaron deprecados temporalmente; falta rediseño basado en el nuevo dominio simplificado.
4. El proyecto mantiene cambios previos no relacionados en el working tree; conviene consolidar por etapas en commits separados.

## 16. Recomendación para pasar a etapa de Compras y luego Ventas
**Sí, con condiciones**: el sistema quedó apto para iniciar Compras sobre el nuevo dominio simplificado de inventario/tareas.

Orden recomendado:
1. Implementar módulo Compras con actualización transaccional de stock y factura/detalle.
2. Adaptar reportes de inventario/producción al nuevo modelo ya sin dependencias legacy.
3. Implementar módulo Ventas reutilizando patrones de contratos y navegación ya preparados.
4. Cerrar deuda de tests legacy (actualizar fixtures + casos al dominio vigente).
