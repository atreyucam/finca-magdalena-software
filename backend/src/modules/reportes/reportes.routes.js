// backend/src/modules/reportes/reportes.routes.js
const { Router } = require('express');
const controller = require('./reportes.controller');
const { requireAuth } = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/rbac.middleware');

const router = Router();

// Todos requieren autenticación.
// Dashboard puede verlo cualquiera con acceso (Propietario/Tecnico), trabajadores limitado si quisieras.
router.get('/dashboard', requireAuth, requireRole('Propietario', 'Tecnico'), controller.dashboard);


router.get(
  '/cosecha/rendimiento', 
  requireAuth, 
  requireRole('Propietario', 'Tecnico'), // Trabajador usualmente no ve esto
  controller.rendimientoCosecha
);

// Nuevas rutas
// 1. Reporte Fitosanitario
router.get(
  '/fitosanitario', 
  requireAuth, 
  requireRole('Propietario', 'Tecnico'), 
  controller.fitoSeguridad
);

// 2. Reporte de Operaciones/Tareas
router.get(
  '/operaciones', 
  requireAuth, 
  requireRole('Propietario', 'Tecnico'), 
  controller.operaciones
);


// 3. Reporte de Costos
router.get(
  '/costos', 
  requireAuth, 
  requireRole('Propietario'), // ⚠️ SOLO PROPIETARIO (Info sensible)
  controller.costosOperativos
);







module.exports = router;


// // Reportes específicos
// router.get('/cosecha', requireAuth, requireRole('Propietario', 'Tecnico'), controller.reporteCosecha);
// router.get('/lote/:id/bitacora', requireAuth, requireRole('Propietario', 'Tecnico'), controller.bitacoraLote);
// router.get('/insumos', requireAuth, requireRole('Propietario', 'Tecnico'), controller.reporteInsumos);
// router.get('/pagos', requireAuth, requireRole('Propietario'), controller.reportePagos); // Solo dueño ve dinero

