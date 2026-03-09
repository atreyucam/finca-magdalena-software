const service = require("./proveedores.service");

exports.crearProveedor = async (req, res, next) => {
  try {
    const created = await service.crearProveedor(req.body || {});
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
};

exports.listarProveedores = async (req, res, next) => {
  try {
    const data = await service.listarProveedores(req.query || {});
    res.json(data);
  } catch (error) {
    next(error);
  }
};
