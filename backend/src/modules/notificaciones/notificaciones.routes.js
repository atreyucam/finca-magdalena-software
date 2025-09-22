const { Router } = require('express');
const svc = require('./notificaciones.service');
const { requireAuth } = require('../../middlewares/auth.middleware');


const router = Router();
router.get('/', requireAuth, async (req,res,next)=>{ try{ res.json(await svc.listar(req.user, req.query)); }catch(e){ next(e);} });
router.patch('/:id/leida', requireAuth, async (req,res,next)=>{ try{ const r=await svc.marcarLeida(req.user, +req.params.id); if(!r) return res.status(404).json({code:'NOT_FOUND'}); res.json(r);}catch(e){ next(e);} });
router.post('/leidas', requireAuth, async (req,res,next)=>{ try{ res.json(await svc.marcarTodas(req.user)); }catch(e){ next(e);} });
module.exports = router;