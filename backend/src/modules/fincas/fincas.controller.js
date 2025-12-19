const service = require('./fincas.service');

exports.crearFinca = async (req, res, next) => {
  try {
    const out = await service.crearFinca(req.body);
    res.status(201).json(out);
  } catch (err) { next(err); }
};

exports.listarFincas = async (req, res, next) => {
  try {
    const out = await service.listarFincas();
    res.json(out);
  } catch (err) { next(err); }
};

exports.obtenerFinca = async (req, res, next) => {
  try {
    const out = await service.obtenerFinca(+req.params.id);
    res.json(out);
  } catch (err) { next(err); }
};

exports.editarFinca = async (req, res, next) => {
  try {
    const out = await service.editarFinca(+req.params.id, req.body);
    res.json(out);
  } catch (err) { next(err); }
};

exports.cambiarEstadoFinca = async (req, res, next) => {
  try {
    const out = await service.cambiarEstadoFinca(+req.params.id);
    res.json(out);
  } catch (err) { next(err); }
};

// backend/src/modules/fincas/fincas.controller.js

exports.obtenerContexto = async (req, res, next) => {
  try {
    const { id } = req.params;
    const out = await service.obtenerContexto(+id);
    res.json(out);
  } catch (err) {
    next(err);
  }
};