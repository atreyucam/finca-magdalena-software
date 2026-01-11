// backend/src/modules/reportes/reportes.controller.js
const service = require("./reportes.service");

exports.reporteTareas = async (req, res, next) => {
  try {
    const out = await service.reporteTareas(req.user, req.query);
    res.json(out);
  } catch (e) { next(e); }
};

// ✅ Inventario: 4 secciones
exports.reporteInventarioResumen = async (req, res, next) => {
  try {
    const out = await service.reporteInventarioResumen(req.user, req.query);
    res.json(out);
  } catch (e) { next(e); }
};

exports.reporteInventarioStock = async (req, res, next) => {
  try {
    const out = await service.reporteInventarioStock(req.user, req.query);
    res.json(out);
  } catch (e) { next(e); }
};

exports.reporteInventarioFefo = async (req, res, next) => {
  try {
    const out = await service.reporteInventarioFefo(req.user, req.query);
    res.json(out);
  } catch (e) { next(e); }
};

exports.reporteInventarioPrestamos = async (req, res, next) => {
  try {
    const out = await service.reporteInventarioPrestamos(req.user, req.query);
    res.json(out);
  } catch (e) { next(e); }
};
