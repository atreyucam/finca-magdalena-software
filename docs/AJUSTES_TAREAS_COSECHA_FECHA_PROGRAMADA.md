# Ajustes Tareas, Cosecha y Fecha Programada

## 1. Objetivo de los ajustes
Refinar el modulo de tareas para alinear creacion, detalle, cierre y cancelacion con el dominio operativo simplificado, asegurando persistencia real de `Fecha programada` como fecha-hora y un flujo de Cosecha reducido a exportacion, nacional, rechazo y total de gavetas.

## 2. Alcance ejecutado
- Backend de tareas: validacion y persistencia de fecha-hora real, saneamiento de detalle de cosecha simplificado.
- Frontend de tareas: crear tarea, detalle de tarea, detalle de ejecucion, registrar avance y cerrar, cancelar tarea.
- Contrato backend/frontend para cierre de cosecha.
- Pruebas de estabilizacion backend y build frontend.

## 3. Hallazgos confirmados en codigo real
- `Fecha programada` ya se mostraba en un `datetime-local` en UI, pero su valor inicial se armaba con `toISOString().slice(0,16)`, provocando desfase por zona horaria.
- Backend aceptaba `fecha_programada` sin exigir explicitamente fecha y hora real en todos los casos.
- En detalle de tarea seguian textos legacy (`Cosecha`, `Etapa / Periodo`) y la etiqueta de actividad mostraba `COSECHA`.
- Hora de inicio/fin en detalle de ejecucion no forzaba formato AM/PM.
- Duracion se mostraba siempre como minutos (`X min`) sin formato horas+minutos.
- `Cancelar tarea` usaba `window.confirm` + `window.prompt`, fuera del patron visual de modales del sistema.
- En `Registrar avance y cerrar` de cosecha no habia formulario operativo con solo exportacion/nacional/rechazo; el flujo estaba incompleto para ese objetivo.

## 4. Como se guardaba antes
### Fecha programada
- Frontend enviaba `fecha_programada` desde `datetime-local` convertido a ISO.
- El valor por defecto se construia con UTC (`toISOString().slice(0,16)`), lo que podia desplazar hora local.
- Backend persistia como `Date`, sin una validacion estricta para rechazar payload sin hora real.

### Detalles de cosecha
- El flujo de cierre/verificacion de cosecha arrastraba estructura legacy y no estaba consolidado en un contrato minimo operativo para exportacion/nacional/rechazo.
- Habia rastro de campos legacy en UI de cierre (incluyendo insumos con lote manual en esa accion).

## 5. Como se guarda ahora
### Fecha programada como fecha-hora
- Frontend inicializa `Fecha programada` con fecha y hora local real (`YYYY-MM-DDTHH:mm`).
- Usuario puede editar fecha y hora libremente en el mismo campo `datetime-local`.
- Frontend envia ISO al backend.
- Backend valida que incluya fecha y hora (`YYYY-MM-DDTHH:mm` o ISO equivalente) y rechaza entradas invalidas.
- Backend persiste como `Date` validada en `Tarea.fecha_programada`.

### Registros de cosecha
- En crear/editar/cierre de cosecha, el contrato funcional activo es:
  - `detalle.clasificacion.exportacion`
  - `detalle.clasificacion.nacional`
  - `detalle.clasificacion.rechazo`
  - `detalle.total_gavetas` calculado
- Backend sanea y normaliza a ese formato para evitar arrastre de ramas legacy en el flujo operativo nuevo.

## 6. Archivos modificados
- `backend/src/modules/tareas/tareas.service.js`
- `backend/src/test/stabilization/tareas.fecha-programada.test.js`
- `frontend/src/components/CrearTareaModal.jsx`
- `frontend/src/components/CompletarVerificarTareaModal.jsx`
- `frontend/src/pages/DetalleTarea.jsx`
- `frontend/src/components/tareas/TaskSpecificDetails.jsx`

## 7. Cambios implementados por bloque
### Crear tarea
- `Fecha programada` se mantiene con el mismo nombre visual.
- Se conserva `datetime-local` pero ahora con default local (sin desfase UTC).
- Terminologia ajustada en cosecha:
  - `Cosecha activa` -> `Periodo`
  - `Etapa (Periodo)` -> `Etapa`
  - `Detalle tecnico` -> `Registros dentro de tarea` (solo para tipo `cosecha`).

### Detalle de tarea
- Etiqueta de actividad en tarea de tipo cosecha: `COSECHA` -> `PERIODO`.
- Bloque contextual:
  - `Cosecha` -> `Periodo`
  - `Etapa / Periodo` -> `Etapa`.

### Detalle de ejecucion
- Hora inicio/fin en formato 12h con AM/PM.
- Duracion:
  - `< 60`: `X min`
  - `>= 60`: `H h MM min`.

### Registrar avance y cerrar
- Para tareas `cosecha`, formulario limitado a:
  - gavetas exportacion
  - gavetas nacional
  - gavetas rechazo
  - total de gavetas calculado automaticamente.
- Payload de cierre/verificacion alineado con contrato simplificado.
- Se eliminan campos manuales de lote de insumo en ese modal.

### Cancelar tarea
- Se reemplaza `confirm/prompt` del navegador por `VentanaModal` consistente con UI del sistema.
- Se mantiene registro de motivo (o `Sin motivo` si queda vacio) y cancelacion funcional via API.

## 8. Contratos backend/frontend afectados
### Crear tarea (`POST /api/tareas`)
- `fecha_programada` ahora exige fecha-hora real (no solo fecha).

### Completar/Verificar tarea (`POST /api/tareas/:id/completar`, `POST /api/tareas/:id/verificar`)
- Para `cosecha`, `detalle` esperado/normalizado:
```json
{
  "clasificacion": {
    "exportacion": 0,
    "nacional": 0,
    "rechazo": 0
  },
  "total_gavetas": 0
}
```

### Cancelar tarea (`POST /api/tareas/:id/cancelar`)
- Se mantiene contrato con `motivo`, ahora capturado desde modal consistente.

## 9. Pruebas ejecutadas
### Comandos
- `backend`: `npm test -- src/test/stabilization --runInBand`
- `backend`: `npm test -- src/test/tareas --runInBand`
- `frontend`: `npm run build`

### Resultados
- Backend (stabilization): 8 suites, 26 tests, todo en PASS.
- Backend (integracion `src/test/tareas`): 2 suites, 10 tests, FAIL por dependencia de BD de test no disponible en este entorno (`SequelizeHostNotFoundError: getaddrinfo ENOTFOUND db`) y timeout en `beforeAll` de una suite.
- Frontend: build exitoso en produccion.

### Evidencia resumida
- PASS nueva suite `tareas.fecha-programada.test.js` validando:
  - acepta fecha-hora
  - rechaza fecha sin hora
  - rechaza formato invalido.
- PASS suite `tareas.cosecha.simplified.test.js` validando normalizacion de clasificacion y total de gavetas.
- FAIL suite historica de integracion `src/test/tareas/*` por infraestructura de BD no levantada en este turno.

## 10. Validaciones funcionales
### Ejecutadas
- Validacion de contrato y persistencia por pruebas backend (fecha-hora y cosecha simplificada).
- Validacion de consistencia UI y compilacion por build frontend.

### Escenarios cubiertos por implementacion + evidencia tecnica
- Crear tarea con `Fecha programada` fecha-hora editable y persistente.
- Terminologia de crear y detalle actualizada (`Periodo`, `Etapa`, `Registros dentro de tarea`).
- Detalle de ejecucion con AM/PM y duracion formateada.
- Registrar avance y cerrar en cosecha solo con exportacion/nacional/rechazo + total.
- Cancelar tarea con modal visual consistente.

## 11. Riesgos pendientes
- No se ejecuto un E2E con navegador y BD real en este turno; la cobertura funcional se soporta en pruebas unitarias/estabilizacion y build.
- La suite de integracion de tareas depende de host `db`; para pasarla se requiere entorno de base de datos de pruebas operativo.
- Persisten componentes legacy no tocados fuera del alcance inmediato; no impactan el flujo operativo ajustado en esta etapa.

## 12. Confirmacion de continuidad hacia Compras
El modulo de tareas queda ajustado y consistente para continuar con la etapa de Compras, con fecha programada fecha-hora real, flujo de cosecha simplificado en cierre y UI de cancelacion alineada.
