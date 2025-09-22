// backend/src/modules/pagos/pagos.controller.js
const service = require('./pagos.service');


exports.consolidarSemana = async (req,res,next)=>{ try{ res.status(201).json(await service.consolidarSemana(req.user, req.body)); }catch(e){ next(e);} };
exports.obtenerSemana = async (req,res,next)=>{ try{ res.json(await service.obtenerSemana(req.query)); }catch(e){ next(e);} };
exports.editarDetalle = async (req,res,next)=>{ try{ res.json(await service.editarDetalle(+req.params.nominaId, +req.params.detalleId, req.body)); }catch(e){ next(e);} };
exports.upsertDetalle = async (req,res,next)=>{ try{ res.status(201).json(await service.upsertDetalle(+req.params.nominaId, req.body)); }catch(e){ next(e);} };
exports.aprobarSemana = async (req,res,next)=>{ try{ res.json(await service.aprobarSemana(req.user, +req.params.nominaId)); }catch(e){ next(e);} };
exports.generarRecibo = async (req,res,next)=>{ try{ res.json(await service.generarRecibo(+req.params.nominaId, +req.params.detalleId)); }catch(e){ next(e);} };
exports.misRecibos = async (req,res,next)=>{ try{ res.json(await service.misRecibos(req.user)); }catch(e){ next(e);} };


