const { Router } = require('express');
const { requireAuth } = require('../../middlewares/auth.middleware');
const controller = require('./tipoActividad.controller');

const router = Router();

router.get('/', requireAuth, controller.listarTipos);

module.exports = router;
