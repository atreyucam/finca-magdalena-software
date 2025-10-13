// backend/src/modules/tareas/tareas.routes.js
const { Router } = require('express');
const controller = require('./tareas.controller');
const { requireAuth } = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/rbac.middleware');


const router = Router();


// Crear tarea (Propietario/Tecnico)
router.post('/', requireAuth, requireRole('Propietario','Tecnico'), controller.crearTarea);
// Asignar responsables (Propietario/Tecnico)
router.post('/:id/asignaciones', requireAuth, requireRole('Propietario','Tecnico'), controller.asignarUsuarios);
// Completar (Trabajador asignado o Técnico)

router.post("/:id/iniciar", requireAuth, controller.iniciarTarea);
router.post('/:id/completar', requireAuth, controller.completarTarea);
// Verificar (solo Técnico)
router.post('/:id/verificar', requireAuth, requireRole('Propietario','Tecnico'), controller.verificarTarea);
// Novedades (asignado, técnico o propietario)
router.post('/:id/novedades', requireAuth, controller.crearNovedad);
router.get('/:id/novedades', requireAuth, controller.listarNovedades);


// Listado y detalle
router.get('/', requireAuth, controller.listarTareas);
router.get('/:id', requireAuth, controller.obtenerTarea);

router.post('/:id/insumos', requireAuth, requireRole('Propietario','Tecnico'), controller.configurarInsumos);
router.get('/:id/insumos', requireAuth, controller.listarInsumos);

// rutas
router.patch('/:id/ActualizarAsignaciones', requireAuth, requireRole('Propietario','Tecnico'), controller.actualizarAsignaciones);

// backend/src/modules/tareas/tareas.routes.js
router.get('/:id/requerimientos', requireAuth, controller.listarRequerimientosTarea);

router.patch('/:id/requerimientos', requireAuth, requireRole('Propietario','Tecnico'), controller.configurarRequerimientos);



module.exports = router;