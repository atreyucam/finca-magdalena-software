// backend/src/modules/tareas/tareas.controller.js
const service = require('./tareas.service');

// --- CREACIÓN Y GESTIÓN BÁSICA ---

exports.crearTarea = async (req, res, next) => {
  try {
    const io = req.app.get("io");
    // Ahora el service espera: { ...datos, items: [], detalle: {} }
    const out = await service.crearTarea(req.user, req.body, io);
    res.status(201).json(out);
  } catch (err) { next(err); }
};

exports.obtenerTarea = async (req, res, next) => {
  try {
    const out = await service.obtenerTarea(req.user, +req.params.id);
    if (!out) return res.status(404).json({ message: 'Tarea no encontrada' });
    res.json(out);
  } catch (err) { next(err); }
};

exports.listarTareas = async (req, res, next) => {
  try {
    // Pasa query params directamente (lote_id, estado, etc.)
    const data = await service.listarTareas(req.user, req.query);
    res.json(data);
  } catch (err) { next(err); }
};

exports.resumenTareas = async (req, res, next) => {
  try {
    const out = await service.resumenTareas(req.user, req.query);
    res.json(out);
  } catch (err) { next(err); }
};

// --- FLUJO DE ESTADOS ---

exports.iniciarTarea = async (req, res, next) => {
  try {
    const io = req.app.get("io");
    const out = await service.iniciarTarea(req.user, +req.params.id, req.body?.comentario, io);
    res.json(out);
  } catch (err) { next(err); }
};

exports.completarTarea = async (req, res, next) => {
  try {
    const io = req.app.get("io");
    // req.body debe incluir { items: [...], detalle: {...} } para cierre real
    const out = await service.completarTarea(req.user, +req.params.id, req.body, io);
    res.json(out);
  } catch (err) { next(err); }
};

exports.verificarTarea = async (req, res, next) => {
  try {
    const io = req.app.get("io");
    const out = await service.verificarTarea(req.user, +req.params.id, req.body, io);
    res.json(out);
  } catch (err) { next(err); }
};

exports.cancelarTarea = async (req, res, next) => {
  try {
    const io = req.app.get("io");
    const out = await service.cancelarTarea(req.user, +req.params.id, req.body, io);
    res.json(out);
  } catch (err) { next(err); }
};

// --- ASIGNACIONES E ITEMS ---

exports.actualizarAsignaciones = async (req, res, next) => {
  try {
    const io = req.app.get("io");
    const out = await service.actualizarAsignaciones(req.user, +req.params.id, req.body, io);
    res.json(out);
  } catch (err) { next(err); }
};

// (Opcional) compat con nombre anterior
exports.asignarUsuarios = exports.actualizarAsignaciones;

exports.configurarItems = async (req, res, next) => {
  try {
    const tareaId = Number(req.params.id);
    const items = Array.isArray(req.body) ? req.body : req.body?.items;
    const out = await service.configurarItems(tareaId, items || [], req.user);
    res.status(201).json(out);
  } catch (err) { next(err); }
};

exports.listarItems = async (req, res, next) => {
  try {
    // Si necesitas listar items separados, usamos obtenerTarea que ya los trae
    const tarea = await service.obtenerTarea(req.user, +req.params.id);
    if (!tarea) return res.status(404).json({ message: 'Tarea no encontrada' });
    res.json(tarea.items || []); 
  } catch (err) { next(err); }
};

// --- NOVEDADES ---

exports.crearNovedad = async (req, res, next) => {
  try {
    const io = req.app.get("io");
    // Nota: El servicio de novedades no cambió drásticamente
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

exports.actualizarDetalles = async (req, res, next) => {
  try {
    const io = req.app.get("io"); // ✅ socket real
    const tareaId = Number(req.params.id);
    const data = await service.actualizarDetalles(req.user, tareaId, req.body, io);
    res.json(data);
  } catch (e) {
    next(e);
  }
};
