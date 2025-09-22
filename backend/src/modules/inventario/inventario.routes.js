// backend/src/modules/inventario/inventario.routes.js
const { Router } = require('express');
const controller = require('./inventario.controller');
const { requireAuth } = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/rbac.middleware');


const router = Router();


// Ítems (Propietario/Tecnico)
router.post('/items', requireAuth, requireRole('Propietario','Tecnico'), controller.crearItem);
router.get('/items', requireAuth, requireRole('Propietario','Tecnico'), controller.listarItems);
router.patch('/items/:id', requireAuth, requireRole('Propietario','Tecnico'), controller.editarItem);


// Ajustes manuales (RF-16)
router.post('/items/:id/ajustes', requireAuth, requireRole('Propietario','Tecnico'), controller.ajustarStock);


// Movimientos
router.get('/movimientos', requireAuth, requireRole('Propietario','Tecnico'), controller.listarMovimientos);


// Préstamos de herramientas (RF-17)
router.post('/herramientas/:id/prestar', requireAuth, requireRole('Propietario','Tecnico'), controller.prestarHerramienta);
router.post('/herramientas/:id/devolver', requireAuth, requireRole('Propietario','Tecnico'), controller.devolverHerramienta);
router.get('/herramientas/no-devueltas', requireAuth, requireRole('Propietario','Tecnico'), controller.listarNoDevueltas);


// Alertas (stock bajo)
router.get('/alertas/stock-bajo', requireAuth, requireRole('Propietario','Tecnico'), controller.alertasStockBajo);


module.exports = router;