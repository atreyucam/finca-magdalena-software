const { Router } = require("express");
const controller = require("./proveedores.controller");
const { requireAuth } = require("../../middlewares/auth.middleware");
const { requireRole } = require("../../middlewares/rbac.middleware");
const { rateLimitByUser } = require("../../middlewares/rateLimitByUser.middleware");

const router = Router();

const proveedoresWriteLimiter = rateLimitByUser({
  windowMs: 60 * 1000,
  max: 30,
  message: { code: "TOO_MANY_REQUESTS", message: "Demasiadas operaciones de proveedores. Intenta de nuevo en 1 minuto." },
});

router.get("/", requireAuth, requireRole("Propietario", "Tecnico"), controller.listarProveedores);
router.post("/", requireAuth, proveedoresWriteLimiter, requireRole("Propietario"), controller.crearProveedor);

module.exports = router;
