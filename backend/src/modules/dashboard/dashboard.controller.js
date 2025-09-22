const service = require('./dashboard.service');
exports.obtener = async (req,res,next)=>{ try{ res.json(await service.obtener(req.user)); }catch(e){ next(e);} };