const service = require("./reportes.filtros.service");

exports.listarFincas = async (req, res, next) => {
  try {
    const out = await service.listarFincas(req.user);
    res.json(out);
  } catch (e) { next(e); }
};

exports.listarCosechasPorFinca = async (req, res, next) => {
  try {
    const out = await service.listarCosechasPorFinca(req.user, req.query);
    res.json(out);
  } catch (e) { next(e); }
};

exports.listarLotesPorFinca = async (req, res, next) => {
  try {
    const out = await service.listarLotesPorFinca(req.user, req.query);
    res.json(out);
  } catch (e) { next(e); }
};
