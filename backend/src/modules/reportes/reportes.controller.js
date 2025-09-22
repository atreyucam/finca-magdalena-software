// backend/src/modules/reportes/reportes.controller.js
const service = require('./reportes.services');


exports.reporteTareas = async (req,res,next)=>{ try{ await service.reporteTareas(req,res); }catch(e){ next(e);} };
exports.reporteConsumo = async (req,res,next)=>{ try{ await service.reporteConsumo(req,res); }catch(e){ next(e);} };