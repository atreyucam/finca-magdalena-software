const { Router } = require('express');
const controller = require('./auth.controller');
const { requireAuth } = require('../../middlewares/auth.middleware');
const { rateLimitByUser } = require('../../middlewares/rateLimitByUser.middleware');

const router = Router();
const refreshLimiter = rateLimitByUser({
  windowMs: 60 * 1000,
  max: 10,
  message: { code: "TOO_MANY_REQUESTS", message: "Demasiados intentos de refresh. Intenta de nuevo en 1 minuto." },
});

// Públicas
router.post('/login', controller.login);
router.post('/refresh', refreshLimiter, controller.refresh);
router.post('/logout', controller.logout); // ✅ Logout agregado

// Privadas (Requieren Token)
router.get('/profile', requireAuth, controller.profile);

module.exports = router;
