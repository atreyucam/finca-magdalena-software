const service = require('./cosechas.service');

exports.listarCosechas = async (req, res, next) => {
  try { res.json(await service.listarCosechas()); }
  catch (err) { next(err); }
};

exports.obtenerCosecha = async (req, res, next) => {
  try {
    const out = await service.obtenerCosecha(+req.params.id);
    if (!out) return res.status(404).json({ message: 'No encontrado' });
    res.json(out);
  } catch (err) { next(err); }
};

exports.crearCosecha = async (req, res, next) => {
  try { res.status(201).json(await service.crearCosecha(req.user, req.body)); }
  catch (err) { next(err); }
};

exports.crearPeriodos = async (req, res, next) => {
  try { res.status(201).json(await service.crearPeriodos(req.user, +req.params.id, req.body)); }
  catch (err) { next(err); }
};
