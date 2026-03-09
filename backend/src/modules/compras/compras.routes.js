const { Router } = require("express");
const controller = require("./compras.controller");
const { requireAuth } = require("../../middlewares/auth.middleware");
const { requireRole } = require("../../middlewares/rbac.middleware");
const { rateLimitByUser } = require("../../middlewares/rateLimitByUser.middleware");

const router = Router();

const comprasWriteLimiter = rateLimitByUser({
  windowMs: 60 * 1000,
  max: 20,
  message: { code: "TOO_MANY_REQUESTS", message: "Demasiadas operaciones de compras. Intenta de nuevo en 1 minuto." },
});

router.get("/", requireAuth, requireRole("Propietario", "Tecnico"), controller.listarCompras);
router.get("/:id", requireAuth, requireRole("Propietario", "Tecnico"), controller.obtenerCompra);
router.post("/", requireAuth, comprasWriteLimiter, requireRole("Propietario"), controller.crearCompra);

module.exports = router;
