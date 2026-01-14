// backend/src/modules/cosechas/cosechas.controller.js
const service = require('./cosechas.service');

exports.listarCosechas = async (req, res, next) => {
  try {
    const out = await service.listarCosechas();
    res.json(out);
  } catch (err) {
    next(err);
  }
};

exports.obtenerCosecha = async (req, res, next) => {
  try {
    const out = await service.obtenerCosecha(+req.params.id);
    if (!out) return res.status(404).json({ message: 'No encontrado' });
    res.json(out);
  } catch (err) {
    next(err);
  }
};

exports.crearCosecha = async (req, res, next) => {
  try {
    const out = await service.crearCosecha(req.user, req.body);
    res.status(201).json(out);
  } catch (err) {
    next(err);
  }
};

exports.cerrarCosecha = async (req, res, next) => {
  try {
    const out = await service.cerrarCosecha(req.user, +req.params.id, req.body);
    res.json(out);
  } catch (err) {
    next(err);
  }
};

exports.crearPeriodos = async (req, res, next) => {
  try {
    const out = await service.crearPeriodos(
      req.user,
      +req.params.id,
      req.body
    );
    res.status(201).json(out);
  } catch (err) {
    next(err);
  }
};

exports.previewNext = async (req, res, next) => {
  try {
    console.log("[/cosechas/next] req.query =", req.query);
    const out = await service.previewNextCosecha(req.user, req.query);
    console.log("[/cosechas/next] out =", out);
    res.json(out);
  } catch (e) {
    console.log("[/cosechas/next] ERROR =", {
      message: e.message,
      code: e.code,
      status: e.status,
      stack: e.stack,
    });
    next(e);
  }
};



// ✅ Actualizar un periodo
exports.actualizarPeriodo = async (req, res, next) => {
  try {
    const out = await service.actualizarPeriodo(
      req.user,
      +req.params.periodoId,
      req.body
    );
    res.json(out);
  } catch (err) {
    next(err);
  }
};

// ✅ Eliminar un periodo
exports.eliminarPeriodo = async (req, res, next) => {
  try {
    const out = await service.eliminarPeriodo(
      req.user,
      +req.params.periodoId
    );
    res.json(out);
  } catch (err) {
    next(err);
  }
};