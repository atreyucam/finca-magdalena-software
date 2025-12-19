// backend/src/modules/lotes/lotes.controller.js
const service = require('./lotes.services');

exports.crearLote = async (req, res, next) => {
  try {
    res.status(201).json(await service.crearLote(req.body));
  } catch (err) {
    next(err);
  }
};

exports.listarLotes = async (req, res, next) => {
  try {
    res.json(await service.listarLotes());
  } catch (err) {
    next(err);
  }
};


// 👇 MODIFICADO
exports.obtenerLote = async (req, res, next) => {
  try {
    const { incluirTareas, page, limit } = req.query;

    const out = await service.obtenerLote(+req.params.id, {
      incluirTareas: incluirTareas === '1' || incluirTareas === 'true',
      page: page ? +page : 1,
      limit: limit ? +limit : 15,
    });

    if (!out) return res.status(404).json({ message: 'No encontrado' });
    res.json(out);
  } catch (err) { next(err); }
};

exports.editarLote = async (req, res, next) => {
  try {
    res.json(await service.editarLote(+req.params.id, req.body));
  } catch (err) {
    next(err);
  }
};

// 🔹 NUEVO: toggle Activo/Inactivo
exports.cambiarEstadoLote = async (req, res, next) => {
  try {
    const out = await service.cambiarEstadoLote(+req.params.id);
    res.json(out);
  } catch (err) {
    next(err);
  }
};
