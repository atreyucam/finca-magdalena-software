// backend/src/modules/pagos/pagos.routes.js
const { Router } = require("express");
const controller = require("./pagos.controller");
const { requireAuth } = require("../../middlewares/auth.middleware");
const { requireRole } = require("../../middlewares/rbac.middleware");
const { rateLimitByUser } = require("../../middlewares/rateLimitByUser.middleware");

const router = Router();
const nominaWriteLimiter = rateLimitByUser({
  windowMs: 60 * 1000,
  max: 10,
  message: { code: "TOO_MANY_REQUESTS", message: "Demasiadas operaciones de nomina. Intenta de nuevo en 1 minuto." },
});
const pagosPdfLimiter = rateLimitByUser({
  windowMs: 60 * 1000,
  max: 20,
  message: { code: "TOO_MANY_REQUESTS", message: "Demasiadas solicitudes de PDF. Intenta de nuevo en 1 minuto." },
});

// =====================
// TAB 1: Gestión nómina
// =====================

// Crear / consolidar semana (Propietario)
// body: { semana_iso: "2025-W37", cosecha_id?: 1 }
router.post("/semana", requireAuth, nominaWriteLimiter, requireRole("Propietario", "Tecnico"), controller.consolidarSemana);

// Obtener semana + detalles
// query: semana_iso=2025-W37 OR nomina_id=123
router.get("/semana", requireAuth, requireRole("Propietario", "Tecnico"), controller.obtenerSemana);

// Toggle excluir/incluir
router.patch(
  "/semana/:nominaId/detalles/:detalleId/excluir",
  requireAuth,
  nominaWriteLimiter,
  requireRole("Propietario", "Tecnico"),
  controller.toggleExcluirDetalle
);

// Editar detalle (salario base, ajustes, método pago, comprobante, observaciones...)
router.patch(
  "/semana/:nominaId/detalles/:detalleId",
  requireAuth,
  nominaWriteLimiter,
  requireRole("Propietario", "Tecnico"),
  controller.editarDetalle
);

// Bulk update (Guardar borrador)
router.patch(
  "/semana/:nominaId/detalles",
  requireAuth,
  nominaWriteLimiter,
  requireRole("Propietario", "Tecnico"),
  controller.bulkUpdateDetalles
);

// Aprobar semana
router.post(
  "/semana/:nominaId/aprobar",
  requireAuth,
  nominaWriteLimiter,
  requireRole("Propietario"),
  controller.aprobarSemana
);

// Tareas del trabajador en esa semana, agrupadas por día (para modal)
router.get(
  "/semana/:nominaId/detalles/:detalleId/tareas",
  requireAuth,
  requireRole("Propietario", "Tecnico"),
  controller.obtenerTareasDetalle
);

// // (Opcional) PDF
// router.post(
//   "/semana/:nominaId/recibos/:detalleId",
//   requireAuth,
//   requireRole("Propietario", "Tecnico", "Trabajador"),
//   controller.generarRecibo
// );
// ✅ VER / DESCARGAR RECIBO (SEGURO)
// query: ?download=true para forzar descarga
router.get(
  "/recibos/:detalleId",
  requireAuth,
  pagosPdfLimiter,
  requireRole("Propietario", "Tecnico", "Trabajador"),
  controller.descargarRecibo
);

// PDF general de la semana (reporte)
router.get(
  "/semana/:nominaId/reporte",
  requireAuth,
  pagosPdfLimiter,
  requireRole("Propietario", "Tecnico"),
  controller.reporteSemanaPDF
);



// Ver mis recibos (Trabajador)
router.get("/mios", requireAuth, controller.misRecibos);

// Listar semanas borrador (para banner o avisos)
router.get(
  "/semanas/borrador",
  requireAuth,
  requireRole("Propietario", "Tecnico"),
  controller.listarSemanasBorrador
);

// Eliminar borrador
router.delete(
  "/semana/:nominaId",
  requireAuth,
  nominaWriteLimiter,
  requireRole("Propietario", "Tecnico"),
  controller.eliminarSemana
);

// =====================
// TAB 2: Historial pagos
// =====================
// query: desde=YYYY-MM-DD&hasta=YYYY-MM-DD&cosecha_id=1&estado=Aprobada
router.get(
  "/historial",
  requireAuth,
  requireRole("Propietario", "Tecnico"),
  controller.historialPagos
);

module.exports = router;
