const { Router } = require('express');
const controller = require('./dashboard.controller');
const { requireAuth } = require('../../middlewares/auth.middleware');


const router = Router();
router.get('/', requireAuth, controller.obtener);
module.exports = router;