const service = require("./ventas.service");

exports.crearEntrega = async (req, res, next) => {
  try {
    const data = await service.crearEntrega(req.user, req.body || {});
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};

exports.listarVentas = async (req, res, next) => {
  try {
    const data = await service.listarVentas(req.query || {});
    res.json(data);
  } catch (error) {
    next(error);
  }
};

exports.obtenerVenta = async (req, res, next) => {
  try {
    const data = await service.obtenerVenta(req.params.id);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

exports.registrarLiquidacion = async (req, res, next) => {
  try {
    const data = await service.registrarLiquidacion(req.user, req.params.id, req.body || {});
    res.json(data);
  } catch (error) {
    next(error);
  }
};

exports.registrarPago = async (req, res, next) => {
  try {
    const data = await service.registrarPago(req.user, req.params.id, req.body || {});
    res.json(data);
  } catch (error) {
    next(error);
  }
};

exports.obtenerDisponibilidadLote = async (req, res, next) => {
  try {
    const data = await service.obtenerDisponibilidadLote(req.params.loteId);
    res.json(data);
  } catch (error) {
    next(error);
  }
};
