// backend/src/modules/inventario/inventario.routes.js
const { Router } = require('express');
const controller = require('./inventario.controller');
const { requireAuth } = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/rbac.middleware');
const { rateLimitByUser } = require('../../middlewares/rateLimitByUser.middleware');

const router = Router();
const inventarioWriteLimiter = rateLimitByUser({
  windowMs: 60 * 1000,
  max: 30,
  message: { code: "TOO_MANY_REQUESTS", message: "Demasiadas operaciones de inventario. Intenta de nuevo en 1 minuto." },
});
const inventarioAjustesLimiter = rateLimitByUser({
  windowMs: 60 * 1000,
  max: 20,
  message: { code: "TOO_MANY_REQUESTS", message: "Demasiados ajustes de inventario. Intenta de nuevo en 1 minuto." },
});

// 1. Rutas Generales y Estáticas (PRIORIDAD ALTA)
router.get('/resumen', requireAuth, controller.getResumen); // <--- NUEVA RUTA AQUÍ
router.get('/items', requireAuth, requireRole('Propietario','Tecnico'), controller.listarItems);
router.get('/movimientos', requireAuth, requireRole('Propietario','Tecnico'), controller.listarMovimientos);
router.get('/herramientas/no-devueltas', requireAuth, requireRole('Propietario','Tecnico'), controller.listarNoDevueltas);
router.get('/alertas/stock-bajo', requireAuth, requireRole('Propietario','Tecnico'), controller.alertasStockBajo);

// 2. Rutas Dinámicas (con :id)
router.post('/items', requireAuth, inventarioWriteLimiter, requireRole('Propietario','Tecnico'), controller.crearItem);
router.patch('/items/:id', requireAuth, inventarioWriteLimiter, requireRole('Propietario','Tecnico'), controller.editarItem);
router.post('/items/:id/ajustes', requireAuth, inventarioAjustesLimiter, requireRole('Propietario','Tecnico'), controller.ajustarStock);
router.patch('/lotes/:loteId', requireAuth, inventarioWriteLimiter, requireRole('Propietario','Tecnico'), controller.editarLote);

// Préstamos
router.post('/herramientas/:id/prestar', requireAuth, inventarioWriteLimiter, requireRole('Propietario','Tecnico'), controller.prestarHerramienta);
router.post('/herramientas/:id/devolver', requireAuth, inventarioWriteLimiter, requireRole('Propietario','Tecnico'), controller.devolverHerramienta);

router.get('/', requireAuth, controller.listar);


// ✅ Validación / Autocomplete de lote (ANTES de rutas dinámicas de /lotes/:loteId)
router.get('/items/:id/lotes/buscar', requireAuth, requireRole('Propietario','Tecnico'), controller.buscarLote);

module.exports = router;
