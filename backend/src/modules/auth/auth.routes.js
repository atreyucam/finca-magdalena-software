const { Router } = require('express');
const controller = require('./auth.controller');
const { requireAuth } = require('../../middlewares/auth.middleware');

const router = Router();

// Públicas
router.post('/login', controller.login);
router.post('/refresh', controller.refresh);
router.post('/logout', controller.logout); // ✅ Logout agregado

// Privadas (Requieren Token)
router.get('/profile', requireAuth, controller.profile);

module.exports = router;