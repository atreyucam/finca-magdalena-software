const { Router } = require('express');
const controller = require('./fincas.controller');
const { requireAuth } = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/rbac.middleware');

const router = Router();

router.get('/', requireAuth, controller.listarFincas);
router.get('/:id', requireAuth, controller.obtenerFinca);

router.post('/', requireAuth, requireRole('Propietario'), controller.crearFinca);
router.patch('/:id', requireAuth, requireRole('Propietario'), controller.editarFinca);
router.patch('/:id/estado', requireAuth, requireRole('Propietario'), controller.cambiarEstadoFinca);

// backend/src/modules/fincas/fincas.routes.js

// ... (otros imports y rutas)
router.get('/:id/contexto', requireAuth, controller.obtenerContexto);

module.exports = router;

module.exports = router;