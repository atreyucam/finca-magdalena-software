// backend/src/modules/pagos/pagos.routes.js
const { Router } = require('express');
const controller = require('./pagos.controller');
const { requireAuth } = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/rbac.middleware');


const router = Router();


// Crear/Consolidar semana (Propietario)
router.post('/semana', requireAuth, requireRole('Propietario'), controller.consolidarSemana);
// Obtener semana + detalles
router.get('/semana', requireAuth, requireRole('Propietario','Tecnico'), controller.obtenerSemana);
// Editar un detalle (Propietario)
router.patch('/semana/:nominaId/detalles/:detalleId', requireAuth, requireRole('Propietario'), controller.editarDetalle);
// Agregar/Upsert detalle manual (Propietario)
router.post('/semana/:nominaId/detalles', requireAuth, requireRole('Propietario'), controller.upsertDetalle);
// Aprobar semana (Propietario)
router.post('/semana/:nominaId/aprobar', requireAuth, requireRole('Propietario'), controller.aprobarSemana);
// Generar recibo PDF (Propietario)
router.post('/semana/:nominaId/recibos/:detalleId', requireAuth, requireRole('Propietario'), controller.generarRecibo);
// Ver mis recibos (Trabajador)
router.get('/mios', requireAuth, controller.misRecibos);


module.exports = router;