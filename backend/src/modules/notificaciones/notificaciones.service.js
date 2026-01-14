// backend/src/modules/notificaciones/notificaciones.service.js
const { models } = require('../../db');

exports.crear = async (usuario_id, {
  tipo = 'General',
  titulo,
  mensaje = '',
  referencia = {},
  prioridad = 'Info'
}) => {
  if (!usuario_id || !titulo) return null;
  const notif = await models.Notificacion.create({
    usuario_id,
    tipo,
    titulo,
    mensaje,
    referencia,
    prioridad
  });
  return notif.toJSON();
};

// ✅ NUEVO: crear + emitir socket
exports.crearYEmitir = async (io, usuario_id, payload) => {
  const notif = await exports.crear(usuario_id, payload);
  if (io && notif) {
    io.to(`user:${usuario_id}`).emit("notif:nueva", notif);
    io.to(`user:${usuario_id}`).emit("notif:refresh"); // opcional para que el front recargue lista/contador
  }
  return notif;
};


exports.crearParaRoles = async (roles = [], payload = {}) => {
  if (!Array.isArray(roles) || roles.length === 0) return [];
  const users = await models.Usuario.findAll({
    include: [{ model: models.Role, where: { nombre: roles } }],
    where: { estado: 'Activo' },
    attributes: ['id'],
  });
  const res = [];
  for (const u of users) res.push(await exports.crear(u.id, payload));
  return res;
};

/**
 * Listar notificaciones paginadas
 * Query:
 *  - soloNoLeidas (true/false)
 *  - limit  (por defecto 20, máx 50)
 *  - offset (por defecto 0)
 */
exports.listar = async (currentUser, query = {}) => {
  const { soloNoLeidas, limit, offset } = query;

  // Tamaño de página
  const pageSize = Math.min(parseInt(limit, 10) || 20, 50);
  const skip = parseInt(offset, 10) || 0;

  const where = { usuario_id: currentUser.sub };
  if (String(soloNoLeidas) === 'true') where.leida = false;

  const { rows, count } = await models.Notificacion.findAndCountAll({
    where,
    order: [['created_at', 'DESC']],
    limit: pageSize,
    offset: skip,
  });

  const items = rows.map((n) => ({
    id: n.id,
    tipo: n.tipo,
    titulo: n.titulo,
    mensaje: n.mensaje,
    referencia: n.referencia,
    leida: n.leida,
    prioridad: n.prioridad,
    created_at: n.created_at,
  }));

  // conteo global de no leídas (para el header)
  const noLeidas = await models.Notificacion.count({
    where: { usuario_id: currentUser.sub, leida: false },
  });

  const nextOffset = skip + pageSize;
  const hasMore = nextOffset < count;

  return {
    items,
    total: count,
    noLeidas,
    hasMore,
    nextOffset,
  };
};

exports.marcarLeida = async (currentUser, id) => {
  const n = await models.Notificacion.findByPk(id);
  if (!n || n.usuario_id !== currentUser.sub) return null;
  n.leida = true;
  await n.save();
  return { id: n.id, leida: n.leida };
};

exports.marcarTodas = async (currentUser) => {
  await models.Notificacion.update(
    { leida: true },
    { where: { usuario_id: currentUser.sub, leida: false } }
  );
  return { ok: true };
};
