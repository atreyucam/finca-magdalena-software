
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


//mano de obra
router.get("/mano-obra/resumen",    requireAuth, requireRole('Propietario','Tecnico'), controller.reporteManoObraResumen);
router.get("/mano-obra/detalle",  requireAuth, requireRole('Propietario','Tecnico'), controller.reporteManoObraDetallado);

// Filtros (catálogos)
router.get("/filtros/fincas", requireAuth,  filtros.listarFincas);
router.get("/filtros/cosechas", requireAuth,  filtros.listarCosechasPorFinca);
router.get("/filtros/lotes", requireAuth,  filtros.listarLotesPorFinca);
console.log(requireRole);


// ✅ Producción / Cosecha
router.get("/produccion/resumen",    requireAuth, requireRole('Propietario','Tecnico'), controller.reporteProduccionResumen);
router.get("/produccion/por-lote",   requireAuth, requireRole('Propietario','Tecnico'), controller.reporteProduccionPorLote);
router.get("/produccion/clasificacion", requireAuth, requireRole('Propietario','Tecnico'), controller.reporteProduccionClasificacion);
router.get("/produccion/merma",      requireAuth, requireRole('Propietario','Tecnico'), controller.reporteProduccionMerma);
router.get("/produccion/logistica",  requireAuth, requireRole('Propietario','Tecnico'), controller.reporteProduccionLogistica);
router.get("/produccion/eventos",    requireAuth, requireRole('Propietario','Tecnico'), controller.reporteProduccionEventos);


router.get("/produccion/comparar/fincas", requireAuth, requireRole('Propietario','Tecnico'), controller.compararFincas);
router.get("/produccion/comparar/cosechas", requireAuth, requireRole('Propietario','Tecnico'), controller.compararCosechas);
router.get("/produccion/comparar/lotes", requireAuth, requireRole('Propietario','Tecnico'), controller.compararLotes);



// ✅ Dashboard (Tareas + Inventario)
router.get(
  "/dashboard",
  requireAuth,
  requireRole("Propietario", "Tecnico"),
  controller.reporteDashboard
);

module.exports = router;
