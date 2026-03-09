// backend/src/modules/notificaciones/notificaciones.service.js
const { Op } = require("sequelize");
const { models } = require("../../db");
const { config } = require("../../config/env");

const DEFAULT_DEDUPE_WINDOW_MS = 60 * 60 * 1000;

let socketServer = null;
let purgeInProgress = false;

function getRetentionDays() {
  return Number(config.notifications?.retentionDays) || 90;
}

function getRetentionCutoffDate(now = Date.now()) {
  const retentionDays = getRetentionDays();
  const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
  return new Date(now - retentionMs);
}

function buildActiveWhereBase(usuarioId) {
  return {
    usuario_id: usuarioId,
    created_at: { [Op.gte]: getRetentionCutoffDate() },
  };
}

function asPlainReference(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value;
}

function mapNotificacion(n) {
  return {
    id: n.id,
    tipo: n.tipo,
    titulo: n.titulo,
    mensaje: n.mensaje,
    referencia: n.referencia,
    leida: n.leida,
    read_at: n.read_at,
    prioridad: n.prioridad,
    created_at: n.created_at,
    updated_at: n.updated_at,
  };
}

function emitirEnTiempoReal(io, usuarioId, notif) {
  if (!io || !notif || !usuarioId) return;
  io.to(`user:${usuarioId}`).emit("notif:nueva", notif);
}

function matchesReferenceSubset(candidateRef = {}, expectedRef = {}) {
  const keys = Object.keys(expectedRef || {});
  if (keys.length === 0) return false;
  return keys.every((key) => String(candidateRef?.[key]) === String(expectedRef?.[key]));
}

async function buscarDuplicadaReciente({
  usuarioId,
  tipo,
  titulo,
  mensaje,
  dedupe = null,
}) {
  if (!dedupe) return null;

  const dedupeWindowMs =
    Number.isFinite(Number(dedupe.windowMs)) && Number(dedupe.windowMs) > 0
      ? Number(dedupe.windowMs)
      : DEFAULT_DEDUPE_WINDOW_MS;

  const dedupeMatch = asPlainReference(dedupe.match);
  const dedupeSince = new Date(Date.now() - dedupeWindowMs);
  const includeMessage = dedupe.includeMessage === true;

  const recientes = await models.Notificacion.findAll({
    where: {
      usuario_id: usuarioId,
      tipo,
      titulo,
      created_at: { [Op.gte]: dedupeSince },
      ...(includeMessage ? { mensaje } : {}),
    },
    order: [["created_at", "DESC"]],
    limit: 25,
  });

  return recientes.find((n) =>
    matchesReferenceSubset(asPlainReference(n.referencia), dedupeMatch)
  ) || null;
}

async function crearBase({ io, usuario_id: usuarioId, payload = {} }) {
  const {
    tipo = "General",
    titulo,
    mensaje = "",
    referencia = {},
    prioridad = "Info",
    dedupe = null,
  } = payload;

  if (!usuarioId || !titulo) return null;

  const normalizedRef = asPlainReference(referencia);
  const existing = await buscarDuplicadaReciente({
    usuarioId,
    tipo,
    titulo,
    mensaje,
    dedupe,
  });
  if (existing) return mapNotificacion(existing);

  const notif = await models.Notificacion.create({
    usuario_id: usuarioId,
    tipo,
    titulo,
    mensaje,
    referencia: normalizedRef,
    prioridad,
    leida: false,
    read_at: null,
  });

  const json = mapNotificacion(notif);
  emitirEnTiempoReal(io || socketServer, usuarioId, json);
  return json;
}

async function purgeExpiredNotifications() {
  if (purgeInProgress) return { deleted: 0, skipped: true };
  purgeInProgress = true;

  try {
    const cutoff = getRetentionCutoffDate();
    const deleted = await models.Notificacion.destroy({
      where: { created_at: { [Op.lt]: cutoff } },
    });
    return { deleted, cutoff };
  } finally {
    purgeInProgress = false;
  }
}

exports.setSocketServer = (io) => {
  socketServer = io || null;
};

exports.getRetentionDays = getRetentionDays;
exports.purgarAntiguas = purgeExpiredNotifications;

exports.crear = async (
  usuarioId,
  {
    tipo = "General",
    titulo,
    mensaje = "",
    referencia = {},
    prioridad = "Info",
    dedupe = null,
  }
) => {
  return crearBase({
    usuario_id: usuarioId,
    payload: { tipo, titulo, mensaje, referencia, prioridad, dedupe },
  });
};

exports.crearYEmitir = async (io, usuarioId, payload) => {
  return crearBase({ io, usuario_id: usuarioId, payload });
};

exports.crearParaRoles = async (roles = [], payload = {}, io) => {
  if (!Array.isArray(roles) || roles.length === 0) return [];
  const users = await models.Usuario.findAll({
    include: [{ model: models.Role, where: { nombre: roles } }],
    where: { estado: "Activo" },
    attributes: ["id"],
  });

  const res = [];
  for (const u of users) {
    res.push(await crearBase({ io, usuario_id: u.id, payload }));
  }
  return res;
};

exports.listar = async (currentUser, query = {}) => {
  const { soloNoLeidas, limit, offset } = query;
  const pageSize = Math.min(parseInt(limit, 10) || 20, 50);
  const skip = parseInt(offset, 10) || 0;

  const where = buildActiveWhereBase(currentUser.sub);
  if (String(soloNoLeidas) === "true") where.leida = false;

  const { rows, count } = await models.Notificacion.findAndCountAll({
    where,
    order: [["created_at", "DESC"]],
    limit: pageSize,
    offset: skip,
  });

  const noLeidas = await models.Notificacion.count({
    where: { ...buildActiveWhereBase(currentUser.sub), leida: false },
  });

  const nextOffset = skip + pageSize;
  const hasMore = nextOffset < count;

  return {
    items: rows.map(mapNotificacion),
    total: count,
    noLeidas,
    hasMore,
    nextOffset,
    retention_days: getRetentionDays(),
  };
};

exports.marcarLeida = async (currentUser, id) => {
  const n = await models.Notificacion.findOne({
    where: { id, ...buildActiveWhereBase(currentUser.sub) },
  });

  if (!n) return null;
  if (!n.leida) {
    n.leida = true;
    n.read_at = new Date();
    await n.save();
  }

  return {
    id: n.id,
    leida: n.leida,
    read_at: n.read_at,
  };
};

exports.marcarTodas = async (currentUser) => {
  const now = new Date();
  const [updated] = await models.Notificacion.update(
    { leida: true, read_at: now },
    { where: { ...buildActiveWhereBase(currentUser.sub), leida: false } }
  );
  return { ok: true, updated };
};
