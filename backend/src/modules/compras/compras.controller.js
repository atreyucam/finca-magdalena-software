const service = require("./compras.service");

exports.crearCompra = async (req, res, next) => {
  try {
    const data = await service.crearCompra(req.user, req.body || {});
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};

exports.listarCompras = async (req, res, next) => {
  try {
    const data = await service.listarCompras(req.query || {});
    res.json(data);
  } catch (error) {
    next(error);
  }
};

exports.obtenerCompra = async (req, res, next) => {
  try {
    const data = await service.obtenerCompra(req.params.id);
    res.json(data);
  } catch (error) {
    next(error);
  }
};
