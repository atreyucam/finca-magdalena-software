const service = require('./usuarios.service');

const emitUsuariosChange = (req, action, payload) => {
  const io = req.app.get("io");
  if (!io) return;
  io.emit("usuarios:changed", { action, ...payload, at: Date.now() });
};


exports.crearUsuario = async (req, res, next) => {
try {
const data = req.body;
const result = await service.crearUsuario(req.user, data);
emitUsuariosChange(req, "created", { usuario: result });
res.status(201).json(result);
} catch (err) { next(err); }
};


exports.listarUsuarios = async (req, res, next) => {
try {
const { q, estado, role, tipo, page = 1, pageSize = 20 } = req.query;
const result = await service.listarUsuarios({ q, estado, role, tipo, page: +page, pageSize: +pageSize });
res.json(result);
} catch (err) { next(err); }
};


exports.obtenerUsuario = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await service.obtenerUsuario(req.user, +id);
    if (!result) return res.status(404).json({ message: 'No encontrado' });
    res.json(result);
  } catch (err) { next(err); }
};

exports.editarUsuario = async (req, res, next) => {
try {
const { id } = req.params;
const data = req.body;
const result = await service.editarUsuario(req.user, +id, data);
emitUsuariosChange(req, "updated", { usuario: result });
res.json(result);
} catch (err) { next(err); }
};


exports.desactivarUsuario = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await service.desactivarUsuario(req.user, +id);

    emitUsuariosChange(req, "estado", { id: result.id, estado: result.estado });

    // ✅ FORZAR LOGOUT EN VIVO si quedó inactivo
    const io = req.app.get("io");
    if (io && result.estado !== "Activo") {
      io.to(`user:${result.id}`).emit("auth:forceLogout", {
        reason: "Usuario desactivado",
      });

      // opcional: desconecta sockets activos
      io.in(`user:${result.id}`).disconnectSockets(true);
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
};


exports.obtenerEstadisticas = async (req, res, next) => {
  try {
    res.json(await service.obtenerEstadisticas());
  } catch (err) { next(err); }
};


exports.obtenerPagosUsuario = async (req, res, next) => {
  try {
    res.json(await service.obtenerPagosUsuario(+req.params.id));
  } catch (err) { next(err); }
};


exports.obtenerTareasUsuario = async (req, res, next) => {
  try {
    res.json(await service.obtenerTareasUsuario(+req.params.id));
  } catch (err) { next(err); }
};




exports.obtenerMiUsuario = async (req, res, next) => {
  try {
    const me = await service.obtenerUsuario(req.user, +req.user.sub);
    if (!me) return res.status(404).json({ message: 'No encontrado' });
    res.json(me);
  } catch (err) { next(err); }
};
exports.obtenerMisPagos = async (req, res, next) => {
  try {
    // Reusa el servicio existente
    const datos = await service.obtenerPagosUsuario(+req.user.sub);
    res.json(datos);
  } catch (err) { next(err); }
};

exports.obtenerMisTareas = async (req, res, next) => {
  try {
    const datos = await service.obtenerTareasUsuario(+req.user.sub);
    res.json(datos);
  } catch (err) { next(err); }
};

exports.obtenerEstadisticas = async (req, res, next) => {
  try {
    const stats = await service.obtenerEstadisticas();
    res.json(stats);
  } catch (err) { next(err); }
};

exports.obtenerTareasUsuarioPorSemana = async (req, res, next) => {
  try {
    res.json(await service.obtenerTareasUsuarioPorSemana(+req.params.id));
  } catch (err) { next(err); }
};

exports.obtenerMisTareasPorSemana = async (req, res, next) => {
  try {
    res.json(await service.obtenerTareasUsuarioPorSemana(+req.user.sub));
  } catch (err) { next(err); }
};
