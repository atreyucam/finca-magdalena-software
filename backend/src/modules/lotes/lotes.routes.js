const { Router } = require('express');
const controller = require('./lotes.controller');
const { requireAuth } = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/rbac.middleware');


const router = Router();


// Propietario y Tecnico gestionan lotes
router.post('/', requireAuth, requireRole('Propietario','Tecnico'), controller.crearLote);
router.get('/', requireAuth, requireRole('Propietario','Tecnico','Trabajador'), controller.listarLotes);
router.get('/:id', requireAuth, requireRole('Propietario','Tecnico','Trabajador'), controller.obtenerLote);
router.patch('/:id', requireAuth, requireRole('Propietario','Tecnico'), controller.editarLote);


module.exports = router;