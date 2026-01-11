
// backend/src/modules/reportes/reportes.routes.js
const { Router } = require("express");
const controller = require("./reportes.controller");
const filtros = require("./reportes.filtros.controller");
const { requireAuth } = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/rbac.middleware');


const router = Router();

router.get("/tareas", requireAuth, requireRole('Propietario','Tecnico'), controller.reporteTareas);

// ✅ Inventario (4 secciones)
router.get("/inventario/resumen",   requireAuth, requireRole('Propietario','Tecnico'), controller.reporteInventarioResumen);
router.get("/inventario/stock",     requireAuth, requireRole('Propietario','Tecnico'), controller.reporteInventarioStock);
router.get("/inventario/fefo",      requireAuth, requireRole('Propietario','Tecnico'), controller.reporteInventarioFefo);
router.get("/inventario/prestamos", requireAuth, requireRole('Propietario','Tecnico'), controller.reporteInventarioPrestamos);


// Filtros (catálogos)
router.get("/filtros/fincas", requireAuth,  filtros.listarFincas);
router.get("/filtros/cosechas", requireAuth,  filtros.listarCosechasPorFinca);
router.get("/filtros/lotes", requireAuth,  filtros.listarLotesPorFinca);
console.log(requireRole);
module.exports = router;
