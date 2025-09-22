// backend/src/modules/reportes/reportes.routes.js
const { Router } = require('express');
const controller = require('./reportes.controller');
const { requireAuth } = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/rbac.middleware');


const router = Router();


router.get('/tareas', requireAuth, requireRole('Propietario','Tecnico'), controller.reporteTareas);
router.get('/consumo', requireAuth, requireRole('Propietario','Tecnico'), controller.reporteConsumo);


module.exports = router;