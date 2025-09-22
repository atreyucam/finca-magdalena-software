const { Router } = require('express');
const controller = require('./metricas.controller');
const { requireAuth } = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/rbac.middleware');

const router = Router();

// Agua, Insumos y Tareas: solo Propietario / Técnico
router.get('/agua', requireAuth, requireRole('Propietario','Tecnico'), controller.agua);
router.get('/insumos', requireAuth, requireRole('Propietario','Tecnico'), controller.insumos);
router.get('/tareas', requireAuth, requireRole('Propietario','Tecnico'), controller.tareas);

module.exports = router;
