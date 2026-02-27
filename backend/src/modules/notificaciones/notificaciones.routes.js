const { Router } = require('express');
const svc = require('./notificaciones.service');
const { requireAuth } = require('../../middlewares/auth.middleware');
const { rateLimitByUser } = require('../../middlewares/rateLimitByUser.middleware');


const router = Router();
const notificacionesReadLimiter = rateLimitByUser({
  windowMs: 60 * 1000,
  max: 120,
  message: { code: "TOO_MANY_REQUESTS", message: "Demasiadas consultas de notificaciones. Intenta de nuevo en 1 minuto." },
});
const notificacionesWriteLimiter = rateLimitByUser({
  windowMs: 60 * 1000,
  max: 60,
  message: { code: "TOO_MANY_REQUESTS", message: "Demasiadas acciones de notificaciones. Intenta de nuevo en 1 minuto." },
});
router.get('/', requireAuth, notificacionesReadLimiter, async (req,res,next)=>{ try{ res.json(await svc.listar(req.user, req.query)); }catch(e){ next(e);} });
router.patch('/:id/leida', requireAuth, notificacionesWriteLimiter, async (req,res,next)=>{ try{ const r=await svc.marcarLeida(req.user, +req.params.id); if(!r) return res.status(404).json({code:'NOT_FOUND'}); res.json(r);}catch(e){ next(e);} });
router.post('/leidas', requireAuth, notificacionesWriteLimiter, async (req,res,next)=>{ try{ res.json(await svc.marcarTodas(req.user)); }catch(e){ next(e);} });
module.exports = router;
