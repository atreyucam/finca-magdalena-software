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
router.post(
  '/',
  requireAuth,
  requireRole('Propietario'),
  controller.crearCosecha
);

// Cerrar cosecha (solo propietario)
router.patch(
  '/:id/cerrar',
  requireAuth,
  requireRole('Propietario'),
  controller.cerrarCosecha
);

// Crear periodos de una cosecha
router.post(
  '/:id/periodos',
  requireAuth,
  requireRole('Propietario'),
  controller.crearPeriodos
);


// ✅ Actualizar un periodo de cosecha
router.patch(
  '/periodos/:periodoId',
  requireAuth,
  requireRole('Propietario'),
  controller.actualizarPeriodo
);

// ✅ Eliminar un periodo de cosecha
router.delete(
  '/periodos/:periodoId',
  requireAuth,
  requireRole('Propietario'),
  controller.eliminarPeriodo
);

module.exports = router;
