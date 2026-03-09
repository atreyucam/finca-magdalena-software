# COMPRAS V1 - Implementacion Tecnica

## 1. Objetivo del modulo
Implementar `Compras V1` como puerta formal de entrada de stock, con compra confirmada, impacto transaccional en inventario/movimientos, integración con proveedores y notificaciones, y frontend operativo para `Propietario`.

## 2. Alcance ejecutado
- Modulo `Proveedores V1` backend y consumo frontend desde flujo de compra.
- Modulo `Compras V1` backend completo (crear/listar/detalle).
- Integracion de compra confirmada con:
  - incremento de stock
  - movimientos de inventario por item
  - notificaciones a `Propietario` y `Tecnico`.
- Frontend de Compras:
  - listado
  - nueva compra (pagina dedicada)
  - detalle
  - alta rapida de proveedor
  - alta rapida de item.
- Ajuste de navegacion/permisos visuales: compras operativo en `Propietario`.
- Pruebas unitarias nuevas de proveedores y compras.

## 3. Hallazgos confirmados en codigo real
- El proyecto usa `sequelize.sync({ alter: true })` en desarrollo (sin migraciones versionadas formales).
- El enum de `notificaciones.tipo` no incluye `Compra`; se usa `Inventario` y referencia estructurada para evento de compra.
- El dominio simplificado de inventario ya estaba operativo sin lotes en flujo principal, pero el modelo de movimientos no tenia `ENTRADA_COMPRA`.

## 4. Decisiones tecnicas adoptadas
- Crear modelos nuevos:
  - `Proveedor`
  - `Compra`
  - `CompraDetalle`.
- Compra con estado unico `CONFIRMADA` en V1.
- Recalculo obligatorio de subtotales/totales en backend (no confiar en frontend).
- Registro de movimiento por cada linea con:
  - `tipo: ENTRADA_COMPRA`
  - referencia JSON con `referencia_tipo`, `referencia_id`, `compra_id`, `numero_factura`.
- Notificacion por compra usando sistema estabilizado (`crearParaRoles`) con `dedupe`.
- UI de alta rapida embebida via modales reutilizando componentes actuales.

## 5. Como se guarda ahora la compra
- Endpoint: `POST /compras`.
- Valida:
  - rol `Propietario`
  - `numero_factura` obligatorio y unico global
  - `proveedor_id` valido y activo
  - al menos un item
  - sin items repetidos
  - `cantidad > 0`, `costo_unitario > 0`.
- Persiste cabecera en tabla `compras` con:
  - `numero_factura`, `proveedor_id`, `fecha_compra`, `observacion`
  - `subtotal`, `total` recalculados
  - `estado = CONFIRMADA`
  - `creado_por`.

## 6. Como se guardan los detalles
- Persiste en `compra_detalles` por cada fila:
  - `compra_id`
  - `inventario_item_id`
  - `cantidad`
  - `costo_unitario`
  - `subtotal`.
- Se enforcea unicidad de item por compra con indice unico:
  - `(compra_id, inventario_item_id)`.

## 7. Como impacta inventario
- Dentro de la misma transaccion de compra:
  - por cada detalle, se invoca `_moverStock` de inventario con `ENTRADA_COMPRA`
  - se incrementa stock del item.
- Si falla cualquier paso (detalle/stock/movimiento), la transaccion revierte completa.

## 8. Como se registran movimientos
- Se extendio enum de `inventario_movimientos.tipo` con `ENTRADA_COMPRA`.
- Cada fila de compra registra movimiento con referencia trazable:
  - `referencia_tipo: COMPRA`
  - `referencia_id: <compra_id>`
  - `compra_id`
  - `numero_factura`
  - `tipo_evento: COMPRA_REGISTRADA`.
- Se ajusto reporte de entradas para contar `ENTRADA_COMPRA`.

## 9. Como funciona el alta rapida de proveedor
- En `Nueva compra`:
  - busqueda/listado de proveedores activos
  - modal `Nuevo proveedor`.
- Al guardar:
  - crea proveedor en backend (`POST /proveedores`)
  - actualiza lista local
  - queda seleccionado automaticamente en la compra.

## 10. Como funciona el alta rapida de item
- En `Nueva compra`:
  - selector/busqueda por nombre de item existente (datalist)
  - modal `Nuevo item de inventario`.
- Al guardar:
  - crea item via API de inventario con `stock_inicial = 0`
  - recarga catalogo
  - queda seleccionado automaticamente en la fila origen.

## 11. Como se integra con notificaciones
- Al confirmar compra:
  - `notificacionesService.crearParaRoles(["Propietario","Tecnico"], ...)`
  - titulo: `Compra registrada`
  - mensaje: `Se registro la compra FAC-XXXX por $YY.YY.`
  - referencia: `tipo_evento: COMPRA_REGISTRADA` + `compra_id`.
- Usa la persistencia/socket/campana/pagina existente (sin bypass).
- Se aplico `dedupe` para evitar duplicaciones por reintentos.

## 12. Archivos modificados
- Backend:
  - `backend/src/app.js`
  - `backend/src/db/index.js`
  - `backend/src/db/models/inventarioMovimiento.js`
  - `backend/src/modules/inventario/inventario.service.js`
  - `backend/src/modules/reportes/reportes.service.js`
  - `backend/src/db/models/proveedor.js` (nuevo)
  - `backend/src/db/models/compra.js` (nuevo)
  - `backend/src/db/models/compraDetalle.js` (nuevo)
  - `backend/src/modules/proveedores/proveedores.service.js` (nuevo)
  - `backend/src/modules/proveedores/proveedores.controller.js` (nuevo)
  - `backend/src/modules/proveedores/proveedores.routes.js` (nuevo)
  - `backend/src/modules/compras/compras.service.js` (nuevo)
  - `backend/src/modules/compras/compras.controller.js` (nuevo)
  - `backend/src/modules/compras/compras.routes.js` (nuevo)
  - `backend/src/test/stabilization/proveedores.v1.test.js` (nuevo)
  - `backend/src/test/stabilization/compras.v1.test.js` (nuevo)
- Frontend:
  - `frontend/src/api/apiClient.js`
  - `frontend/src/routes/AppRouter.jsx`
  - `frontend/src/layouts/TechLayout.jsx`
  - `frontend/src/components/app/AppTitle.jsx`
  - `frontend/src/components/ui/Badge.jsx`
  - `frontend/src/components/NotificationsBell.jsx`
  - `frontend/src/pages/Notificaciones.jsx`
  - `frontend/src/components/compras/FormularioProveedorRapido.jsx` (nuevo)
  - `frontend/src/components/compras/FormularioItemRapidoCompra.jsx` (nuevo)
  - `frontend/src/pages/Compras.jsx` (nuevo)
  - `frontend/src/pages/NuevaCompra.jsx` (nuevo)
  - `frontend/src/pages/DetalleCompra.jsx` (nuevo)

## 13. Contratos API creados o modificados
- Nuevos endpoints proveedores:
  - `GET /proveedores` (listar/buscar)
  - `POST /proveedores` (crear)
- Nuevos endpoints compras:
  - `POST /compras` (crear compra confirmada)
  - `GET /compras` (listar compras)
  - `GET /compras/:id` (detalle de compra)
- Ajuste existente:
  - `inventario_movimientos.tipo` ahora admite `ENTRADA_COMPRA`
  - reportes de entradas contemplan `ENTRADA_COMPRA`.

## 14. Pruebas ejecutadas
### Comandos
- Backend (nuevas pruebas):
  - `npm test -- --runInBand src/test/stabilization/proveedores.v1.test.js src/test/stabilization/compras.v1.test.js`
- Backend (suite completa):
  - `npm test`
- Frontend:
  - `npm run build`

### Resultados
- Nuevas pruebas de compras/proveedores: **PASS** (12/12).
- Suite completa backend: **FAIL parcial** por entorno en pruebas legacy de tareas (`SequelizeHostNotFoundError: getaddrinfo ENOTFOUND db` y timeouts de hooks DB), no por las pruebas nuevas de Compras.
- Build frontend: **PASS**.

### Evidencia resumida
- `compras.v1.test.js` valida:
  - compra valida
  - factura duplicada
  - compra sin items
  - item repetido
  - cantidad/costo invalidos
  - recalculo backend de totales
  - fallo de movimiento -> transaccion falla y no notifica.
- `proveedores.v1.test.js` valida:
  - creacion
  - validacion ruc
  - conflicto por duplicado
  - listado paginado.

## 15. Validaciones funcionales runtime
- Ejecutadas en este entorno:
  - verificacion de compilacion frontend
  - verificacion automatizada de servicios backend con mocks transaccionales.
- Pendientes manuales con backend+db levantados:
  1. Propietario navega a `/owner/compras`.
  2. Crea compra nueva con proveedor existente.
  3. Alta rapida de proveedor desde modal y autoseleccion.
  4. Alta rapida de item desde modal y autoseleccion en fila.
  5. Guarda compra y verifica:
     - stock incrementado
     - movimientos `ENTRADA_COMPRA`
     - notificacion en campana/pagina.
  6. Abre detalle de compra y valida consistencia de cabecera/detalle.

## 16. Riesgos pendientes
- Al usar `sync({ alter: true })`, los cambios de enums/tablas en ambientes compartidos requieren cuidado operativo.
- Existen pruebas legacy que dependen de infraestructura DB externa (`host db`) y pueden fallar fuera de docker-compose.
- No se implemento anulacion/edicion de compra (fuera de alcance V1), por lo que correcciones deben gestionarse operativamente.

## 17. Confirmacion para base de Ventas
`Compras V1` queda implementado y funcional como base para Ventas en cuanto a:
- entrada formal de stock
- trazabilidad de movimientos por referencia de compra
- validaciones de negocio en backend
- flujo UI completo de registro y consulta
- integración con proveedores y notificaciones.

Pendiente antes de arrancar Ventas en entorno productivo: ejecutar la validacion runtime manual completa con base de datos levantada y datos reales de prueba.
