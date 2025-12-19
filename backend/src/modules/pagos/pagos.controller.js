// backend/src/modules/pagos/pagos.controller.js
const service = require("./pagos.service");

exports.consolidarSemana = async (req, res, next) => {
  try {
    res.status(201).json(await service.consolidarSemana(req.user, req.body));
  } catch (e) {
    next(e);
  }
};

exports.obtenerSemana = async (req, res, next) => {
  try {
    res.json(await service.obtenerSemana(req.query));
  } catch (e) {
    next(e);
  }
};

exports.editarDetalle = async (req, res, next) => {
  try {
    res.json(
      await service.editarDetalle(+req.params.nominaId, +req.params.detalleId, req.body)
    );
  } catch (e) {
    next(e);
  }
};

exports.bulkUpdateDetalles = async (req, res, next) => {
  try {
    res.json(await service.bulkUpdateDetalles(+req.params.nominaId, req.body));
  } catch (e) {
    next(e);
  }
};

exports.toggleExcluirDetalle = async (req, res, next) => {
  try {
    res.json(
      await service.toggleExcluirDetalle(+req.params.nominaId, +req.params.detalleId, req.body)
    );
  } catch (e) {
    next(e);
  }
};

exports.aprobarSemana = async (req, res, next) => {
  try {
    res.json(await service.aprobarSemana(req.user, +req.params.nominaId));
  } catch (e) {
    next(e);
  }
};

exports.obtenerTareasDetalle = async (req, res, next) => {
  try {
    res.json(
      await service.obtenerTareasDetalle(+req.params.nominaId, +req.params.detalleId)
    );
  } catch (e) {
    next(e);
  }
};

exports.generarRecibo = async (req, res, next) => {
  try {
    res.json(await service.generarRecibo(+req.params.nominaId, +req.params.detalleId));
  } catch (e) {
    next(e);
  }
};

exports.misRecibos = async (req, res, next) => {
  try {
    res.json(await service.misRecibos(req.user));
  } catch (e) {
    next(e);
  }
};

exports.listarSemanasBorrador = async (req, res, next) => {
  try {
    res.json(await service.listarSemanasBorrador());
  } catch (e) {
    next(e);
  }
};

exports.eliminarSemana = async (req, res, next) => {
  try {
    res.json(await service.eliminarSemana(req.user, +req.params.nominaId));
  } catch (e) {
    next(e);
  }
};

exports.historialPagos = async (req, res, next) => {
  try {
    res.json(await service.historialPagos(req.query));
  } catch (e) {
    next(e);
  }
};


exports.descargarRecibo = async (req, res, next) => {
  try {
    const download = String(req.query.download || "false") === "true";
    await service.descargarRecibo(req.user, +req.params.detalleId, { download, res });
  } catch (e) {
    next(e);
  }
};


exports.reporteSemanaPDF = async (req, res, next) => {
  try {
    const out = await service.reporteSemanaPDF(+req.params.nominaId);
    res.json(out); // { url: "/files/reportes/..." }
  } catch (e) {
    next(e);
  }
};
