
// backend/src/modules/reportes/reportes.routes.js
const { Router } = require("express");
const controller = require("./reportes.controller");
const filtros = require("./reportes.filtros.controller");
const { requireAuth } = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/rbac.middleware');
const { rateLimitByUser } = require("../../middlewares/rateLimitByUser.middleware");


const router = Router();
const reportesLimiter = rateLimitByUser({
  windowMs: 60 * 1000,
  max: 60,
  message: { code: "TOO_MANY_REQUESTS", message: "Demasiadas solicitudes de reportes. Intenta de nuevo en 1 minuto." },
});

router.get("/tareas", requireAuth, reportesLimiter, requireRole('Propietario','Tecnico'), controller.reporteTareas);

// ✅ Inventario (4 secciones)
router.get("/inventario/resumen",   requireAuth, reportesLimiter, requireRole('Propietario','Tecnico'), controller.reporteInventarioResumen);
router.get("/inventario/stock",     requireAuth, reportesLimiter, requireRole('Propietario','Tecnico'), controller.reporteInventarioStock);
router.get("/inventario/fefo",      requireAuth, reportesLimiter, requireRole('Propietario','Tecnico'), controller.reporteInventarioFefo);
router.get("/inventario/prestamos", requireAuth, reportesLimiter, requireRole('Propietario','Tecnico'), controller.reporteInventarioPrestamos);


//mano de obra
router.get("/mano-obra/resumen",    requireAuth, reportesLimiter, requireRole('Propietario','Tecnico'), controller.reporteManoObraResumen);
router.get("/mano-obra/detalle",  requireAuth, reportesLimiter, requireRole('Propietario','Tecnico'), controller.reporteManoObraDetallado);

// Filtros (catálogos)
router.get("/filtros/fincas", requireAuth, reportesLimiter, filtros.listarFincas);
router.get("/filtros/cosechas", requireAuth, reportesLimiter, filtros.listarCosechasPorFinca);
router.get("/filtros/lotes", requireAuth, reportesLimiter, filtros.listarLotesPorFinca);
console.log(requireRole);


// ✅ Producción / Cosecha
router.get("/produccion/resumen",    requireAuth, reportesLimiter, requireRole('Propietario','Tecnico'), controller.reporteProduccionResumen);
router.get("/produccion/por-lote",   requireAuth, reportesLimiter, requireRole('Propietario','Tecnico'), controller.reporteProduccionPorLote);
router.get("/produccion/clasificacion", requireAuth, reportesLimiter, requireRole('Propietario','Tecnico'), controller.reporteProduccionClasificacion);
router.get("/produccion/merma",      requireAuth, reportesLimiter, requireRole('Propietario','Tecnico'), controller.reporteProduccionMerma);
router.get("/produccion/logistica",  requireAuth, reportesLimiter, requireRole('Propietario','Tecnico'), controller.reporteProduccionLogistica);
router.get("/produccion/eventos",    requireAuth, reportesLimiter, requireRole('Propietario','Tecnico'), controller.reporteProduccionEventos);


router.get("/produccion/comparar/fincas", requireAuth, reportesLimiter, requireRole('Propietario','Tecnico'), controller.compararFincas);
router.get("/produccion/comparar/cosechas", requireAuth, reportesLimiter, requireRole('Propietario','Tecnico'), controller.compararCosechas);
router.get("/produccion/comparar/lotes", requireAuth, reportesLimiter, requireRole('Propietario','Tecnico'), controller.compararLotes);



// ✅ Dashboard (Tareas + Inventario)
router.get(
  "/dashboard",
  requireAuth,
  reportesLimiter,
  requireRole("Propietario", "Tecnico"),
  controller.reporteDashboard
);

module.exports = router;
