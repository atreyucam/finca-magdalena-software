const service = require("./clientes.service");

exports.crearCliente = async (req, res, next) => {
  try {
    const created = await service.crearCliente(req.body || {});
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
};

exports.listarClientes = async (req, res, next) => {
  try {
    const data = await service.listarClientes(req.query || {});
    res.json(data);
  } catch (error) {
    next(error);
  }
};

exports.obtenerCliente = async (req, res, next) => {
  try {
    const data = await service.obtenerCliente(req.params.id);
    res.json(data);
  } catch (error) {
    next(error);
  }
};
