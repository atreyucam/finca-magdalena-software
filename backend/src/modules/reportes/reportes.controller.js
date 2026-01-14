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

exports.reporteManoObraResumen = async (req, res, next) => {
  try {
    const out = await service.reporteManoObraResumen(req.user, req.query);
    res.json(out);
  } catch (e) {
    next(e);
  }
};

exports.reporteManoObraDetallado = async (req, res, next) => {
  try {
    const out = await service.reporteManoObraDetallado(req.user, req.query);
    res.json(out);
  } catch (e) {
    next(e);
  }
};


// ✅ Producción / Cosecha
exports.reporteProduccionResumen = async (req, res, next) => {
  try {
    const out = await service.reporteProduccionResumen(req.user, req.query);
    res.json(out);
  } catch (e) { next(e); }
};

exports.reporteProduccionPorLote = async (req, res, next) => {
  try {
    const out = await service.reporteProduccionPorLote(req.user, req.query);
    res.json(out);
  } catch (e) { next(e); }
};

exports.reporteProduccionClasificacion = async (req, res, next) => {
  try {
    const out = await service.reporteProduccionClasificacion(req.user, req.query);
    res.json(out);
  } catch (e) { next(e); }
};

exports.reporteProduccionMerma = async (req, res, next) => {
  try {
    const out = await service.reporteProduccionMerma(req.user, req.query);
    res.json(out);
  } catch (e) { next(e); }
};

exports.reporteProduccionLogistica = async (req, res, next) => {
  try {
    const out = await service.reporteProduccionLogistica(req.user, req.query);
    res.json(out);
  } catch (e) { next(e); }
};

exports.reporteProduccionEventos = async (req, res, next) => {
  try {
    const out = await service.reporteProduccionEventos(req.user, req.query);
    res.json(out);
  } catch (e) { next(e); }
};

exports.compararFincas = async (req, res, next) => {
  try {
    const result = await service.compararFincas(req.user, req.query);
    res.json(result);
  } catch (err) { next(err); }
};

exports.compararCosechas = async (req, res, next) => {
  try {
    const result = await service.compararCosechas(req.user, req.query);
    res.json(result);
  } catch (err) { next(err); }
};

exports.compararLotes = async (req, res, next) => {
  try {
    const result = await service.compararLotes(req.user, req.query);
    res.json(result);
  } catch (err) { next(err); }
};

exports.reporteDashboard = async (req, res, next) => {
  try {
    const out = await service.reporteDashboard(req.user, req.query);
    res.json(out);
  } catch (e) {
    next(e);
  }
};
