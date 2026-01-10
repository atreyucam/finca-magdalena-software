
// backend/src/modules/reportes/reportes.routes.js
const { Router } = require("express");
const controller = require("./reportes.controller");
const filtros = require("./reportes.filtros.controller");
const { requireAuth } = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/rbac.middleware');


const router = Router();

router.get("/tareas", requireAuth, requireRole('Propietario','Tecnico'), controller.reporteTareas);

// Filtros (catálogos)
router.get("/filtros/fincas", requireAuth,  filtros.listarFincas);
router.get("/filtros/cosechas", requireAuth,  filtros.listarCosechasPorFinca);
router.get("/filtros/lotes", requireAuth,  filtros.listarLotesPorFinca);
console.log(requireRole);
module.exports = router;
