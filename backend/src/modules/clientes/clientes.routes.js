const { Router } = require("express");
const controller = require("./clientes.controller");
const { requireAuth } = require("../../middlewares/auth.middleware");
const { requireRole } = require("../../middlewares/rbac.middleware");
const { rateLimitByUser } = require("../../middlewares/rateLimitByUser.middleware");

const router = Router();

const clientesWriteLimiter = rateLimitByUser({
  windowMs: 60 * 1000,
  max: 30,
  message: { code: "TOO_MANY_REQUESTS", message: "Demasiadas operaciones de clientes. Intenta de nuevo en 1 minuto." },
});

router.get("/", requireAuth, requireRole("Propietario", "Tecnico"), controller.listarClientes);
router.get("/:id", requireAuth, requireRole("Propietario", "Tecnico"), controller.obtenerCliente);
router.post("/", requireAuth, clientesWriteLimiter, requireRole("Propietario", "Tecnico"), controller.crearCliente);

module.exports = router;
