// backend/src/modules/tareas/tareas.routes.js
const { Router } = require('express');
const controller = require('./tareas.controller');
const { requireAuth } = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/rbac.middleware');


const router = Router();


// resumen de tareas (para cards y dashboard)
router.get('/resumen', requireAuth, controller.resumenTareas);

// listado y detalle de tareas
router.get('/', requireAuth, controller.listarTareas);
router.get('/:id', requireAuth, controller.obtenerTarea);


// Crear tarea (Propietario/Tecnico)
router.post('/', requireAuth, requireRole('Propietario','Tecnico'), controller.crearTarea);

// Asignar responsables (Propietario/Tecnico)
router.post('/:id/asignaciones', requireAuth, requireRole('Propietario','Tecnico'), controller.asignarUsuarios);
router.patch('/:id/ActualizarAsignaciones', requireAuth, requireRole('Propietario','Tecnico'), controller.actualizarAsignaciones);

// Items de tarea (unificado: Insumo / herramienta / equipo)
router.post('/:id/items', requireAuth, requireRole('Propietario','Tecnico'), controller.configurarItems);
router.get('/:id/items', requireAuth, controller.listarItems);

// Iniciar / completar / verificar tarea
router.post("/:id/iniciar", requireAuth, controller.iniciarTarea);
router.post('/:id/completar', requireAuth, controller.completarTarea);
router.post('/:id/verificar', requireAuth, requireRole('Propietario','Tecnico'), controller.verificarTarea);
router.post("/:id/cancelar", requireAuth, requireRole('Propietario','Tecnico'), controller.cancelarTarea)

// Novedades
router.post('/:id/novedades', requireAuth, controller.crearNovedad);
router.get('/:id/novedades', requireAuth, controller.listarNovedades);

router.patch(
  "/:id/cosecha",
  requireAuth,
  controller.actualizarCosecha
);

module.exports = router;



