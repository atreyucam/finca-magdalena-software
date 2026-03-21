const { Router } = require("express");
const controller = require("./ventas.controller");
const { requireAuth } = require("../../middlewares/auth.middleware");
const { requireRole } = require("../../middlewares/rbac.middleware");
const { rateLimitByUser } = require("../../middlewares/rateLimitByUser.middleware");

const router = Router();

const ventasWriteLimiter = rateLimitByUser({
  windowMs: 60 * 1000,
  max: 25,
  message: { code: "TOO_MANY_REQUESTS", message: "Demasiadas operaciones de ventas. Intenta de nuevo en 1 minuto." },
});

router.get("/", requireAuth, requireRole("Propietario", "Tecnico"), controller.listarVentas);
router.get(
  "/disponibilidad/lote/:loteId",
  requireAuth,
  requireRole("Propietario", "Tecnico"),
  controller.obtenerDisponibilidadLote
);
router.get("/:id", requireAuth, requireRole("Propietario", "Tecnico"), controller.obtenerVenta);

router.post(
  "/",
  requireAuth,
  ventasWriteLimiter,
  requireRole("Propietario", "Tecnico"),
  controller.crearEntrega
);

router.patch(
  "/:id/liquidacion",
  requireAuth,
  ventasWriteLimiter,
  requireRole("Propietario"),
  controller.registrarLiquidacion
);

router.patch(
  "/:id/pago",
  requireAuth,
  ventasWriteLimiter,
  requireRole("Propietario"),
  controller.registrarPago
);

module.exports = router;
