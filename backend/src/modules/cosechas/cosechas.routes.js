// backend/src/modules/cosechas/cosechas.routes.js
const { Router } = require('express');
const controller = require('./cosechas.controller');
const { requireAuth } = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/rbac.middleware');

const router = Router();

// Listar todas las cosechas
router.get('/', requireAuth, controller.listarCosechas);

// Obtener una cosecha con sus periodos
router.get('/:id', requireAuth, controller.obtenerCosecha);

// Crear cosecha (solo propietario)
router.post('/', requireAuth, requireRole('Propietario'), controller.crearCosecha);

// Crear periodos de una cosecha
router.post('/:id/periodos', requireAuth, requireRole('Propietario'), controller.crearPeriodos);

module.exports = router;
