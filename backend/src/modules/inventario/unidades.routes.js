// backend/src/modules/inventario/unidades.routes.js
const { Router } = require('express');
const controller = require('./inventario.controller');
const { requireAuth } = require('../../middlewares/auth.middleware');

const router = Router();

// Todos los usuarios autenticados pueden consultar unidades
router.get('/', requireAuth, controller.listar);

module.exports = router;
