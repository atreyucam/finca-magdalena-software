// backend/src/modules/tareas/tareas.controller.js
const service = require('./tareas.service');

exports.crearTarea = async (req, res, next) => {
  try {
    const io = req.app.get("io");
    const out = await service.crearTarea(req.user, req.body, io);
    res.status(201).json(out);
  } catch (err) { next(err); }
};

exports.asignarUsuarios = async (req, res, next) => {
  try {
    const io = req.app.get("io");
    const out = await service.asignarUsuarios(req.user, +req.params.id, req.body, io);
    res.json(out);
  } catch (err) { next(err); }
};

// NUEVO: iniciarTarea
exports.iniciarTarea = async (req, res, next) => {
  try {
    const io = req.app.get("io");
    const out = await service.iniciarTarea(
      req.user,
      +req.params.id,
      req.body?.comentario,
      io
    );
    res.json(out);
  } catch (err) {
    next(err);
  }
};

// backend/src/modules/tareas/tareas.controller.js (completar)
exports.completarTarea = async (req, res, next) => {
  try {
    const io = req.app.get("io");
    // Pasa el body completo para permitir { comentario, indicadores }
    const out = await service.completarTarea(req.user, +req.params.id, req.body, io);
    res.json(out);
  } catch (err) { next(err); }
};

// ... y verificar igual, ya lo tienes así:
exports.verificarTarea = async (req, res, next) => {
  try {
    const io = req.app.get("io");
    // ya pasas req.body como 3er argumento (comentarioOrBody)
    const out = await service.verificarTarea(req.user, +req.params.id, req.body, io);
    res.json(out);
  } catch (err) { next(err); }
};


exports.crearNovedad = async (req, res, next) => {
  try {
    const io = req.app.get("io");
    const out = await service.crearNovedad(req.user, +req.params.id, req.body, io);
    res.status(201).json(out);
  } catch (err) { next(err); }
};

exports.listarNovedades = async (req, res, next) => {
  try {
    const out = await service.listarNovedades(req.user, +req.params.id);
    res.json(out);
  } catch (err) { next(err); }
};

exports.listarTareas = async (req, res, next) => {
  try {
    const { lote_id, estado, desde, hasta, asignadoA, page = 1, pageSize = 20 } = req.query;
    const out = await service.listarTareas(req.user, {
      lote_id: lote_id ? +lote_id : undefined,
      estado,
      desde,
      hasta,
      asignadoA: asignadoA ? +asignadoA : undefined,
      page: +page,
      pageSize: +pageSize,
    });
    res.json(out);
  } catch (err) { next(err); }
};

exports.obtenerTarea = async (req, res, next) => {
  try {
    const out = await service.obtenerTarea(req.user, +req.params.id);
    if (!out) return res.status(404).json({ message: 'No encontrado' });
    res.json(out);
  } catch (err) { next(err); }
};

exports.configurarInsumos = async (req, res, next) => {
  try {
    const io = req.app.get("io");
    const out = await service.configurarInsumos(req.user, +req.params.id, req.body, io);
    res.status(201).json(out);
  } catch (err) { next(err); }
};

exports.listarInsumos = async (req, res, next) => {
  try {
    const out = await service.listarInsumos(req.user, +req.params.id);
    res.json(out);
  } catch (err) { next(err); }
};


// controller
exports.actualizarAsignaciones = async (req, res, next) => {
  try {
    const io = req.app.get("io");
    const out = await service.actualizarAsignaciones(req.user, +req.params.id, req.body, io);
    res.json(out);
  } catch (err) { next(err); }
};


// backend/src/modules/tareas/tareas.controller.js
exports.configurarRequerimientos = async (req, res, next) => {
  try {
    const io = req.app.get("io");
    const out = await service.configurarRequerimientos(req.user, +req.params.id, req.body, io);
    res.status(201).json(out);
  } catch (err) { next(err); }
};


exports.listarRequerimientosTarea = async (req, res, next) => {
  try {
    const out = await service.listarRequerimientosTarea(req.user, +req.params.id);
    res.json(out);
  } catch (err) { next(err); }
};