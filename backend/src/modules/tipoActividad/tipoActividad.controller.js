const service = require('./tipoActividad.service');

exports.listarTipos = async (req, res, next) => {
  try {
    res.json(await service.listarTipos());
  } catch (err) {
    next(err);
  }
};
