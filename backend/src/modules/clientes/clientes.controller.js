const service = require("./clientes.service");

exports.crearCliente = async (req, res, next) => {
  try {
    const created = await service.crearCliente(req.body || {});
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
};

exports.editarCliente = async (req, res, next) => {
  try {
    const updated = await service.editarCliente(req.params.id, req.body || {});
    res.json(updated);
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

exports.desactivarCliente = async (req, res, next) => {
  try {
    const data = await service.desactivarCliente(req.params.id);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

exports.eliminarCliente = async (req, res, next) => {
  try {
    const data = await service.eliminarCliente(req.params.id);
    res.json(data);
  } catch (error) {
    next(error);
  }
};
