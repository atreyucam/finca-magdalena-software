// backend/src/modules/inventario/inventario.routes.js
const { Router } = require('express');
const controller = require('./inventario.controller');
const { requireAuth } = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/rbac.middleware');

const router = Router();

// 1. Rutas Generales y Estáticas (PRIORIDAD ALTA)
router.get('/resumen', requireAuth, controller.getResumen); // <--- NUEVA RUTA AQUÍ
router.get('/items', requireAuth, requireRole('Propietario','Tecnico'), controller.listarItems);
router.get('/movimientos', requireAuth, requireRole('Propietario','Tecnico'), controller.listarMovimientos);
router.get('/herramientas/no-devueltas', requireAuth, requireRole('Propietario','Tecnico'), controller.listarNoDevueltas);
router.get('/alertas/stock-bajo', requireAuth, requireRole('Propietario','Tecnico'), controller.alertasStockBajo);

// 2. Rutas Dinámicas (con :id)
router.post('/items', requireAuth, requireRole('Propietario','Tecnico'), controller.crearItem);
router.patch('/items/:id', requireAuth, requireRole('Propietario','Tecnico'), controller.editarItem);
router.post('/items/:id/ajustes', requireAuth, requireRole('Propietario','Tecnico'), controller.ajustarStock);

// Préstamos
router.post('/herramientas/:id/prestar', requireAuth, requireRole('Propietario','Tecnico'), controller.prestarHerramienta);
router.post('/herramientas/:id/devolver', requireAuth, requireRole('Propietario','Tecnico'), controller.devolverHerramienta);

router.get('/', requireAuth, controller.listar);

module.exports = router;