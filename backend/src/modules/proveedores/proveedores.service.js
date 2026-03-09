const { Op } = require("sequelize");
const { models } = require("../../db");

function badRequest(message = "Solicitud invalida") {
  const e = new Error(message);
  e.status = 400;
  e.code = "BAD_REQUEST";
  return e;
}

function conflict(message = "Conflicto de datos") {
  const e = new Error(message);
  e.status = 409;
  e.code = "CONFLICT";
  return e;
}

function normalizeText(value, { upper = false } = {}) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return upper ? text.toUpperCase() : text;
}

function normalizeRuc(raw) {
  const value = normalizeText(raw, { upper: true });
  if (!value) return null;

  const simple = /^[A-Z0-9-]+$/;
  if (!simple.test(value) || value.length < 5 || value.length > 20) {
    throw badRequest("RUC/identificacion invalido");
  }

  const digitsOnly = /^\d+$/.test(value);
  if (digitsOnly && ![10, 13].includes(value.length)) {
    throw badRequest("RUC numerico invalido: debe tener 10 o 13 digitos");
  }

  return value;
}

function normalizeEmail(raw) {
  const value = normalizeText(raw);
  if (!value) return null;

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  if (!valid) throw badRequest("Correo invalido");
  return value.toLowerCase();
}

function normalizePhone(raw) {
  const value = normalizeText(raw);
  if (!value) return null;

  const valid = /^[0-9+\-()\s]{6,30}$/.test(value);
  if (!valid) throw badRequest("Telefono invalido");
  return value;
}

function mapProveedor(row) {
  return {
    id: row.id,
    nombre: row.nombre,
    ruc: row.ruc,
    telefono: row.telefono,
    correo: row.correo,
    direccion: row.direccion,
    activo: row.activo,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

exports.crearProveedor = async (payload = {}) => {
  const nombre = normalizeText(payload.nombre);
  if (!nombre) throw badRequest("Nombre o razon social es obligatorio");

  const data = {
    nombre,
    ruc: normalizeRuc(payload.ruc),
    telefono: normalizePhone(payload.telefono),
    correo: normalizeEmail(payload.correo),
    direccion: normalizeText(payload.direccion),
    activo: payload.activo === false ? false : true,
  };

  try {
    const row = await models.Proveedor.create(data);
    return mapProveedor(row);
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      throw conflict("Ya existe un proveedor con ese RUC/identificacion");
    }
    throw error;
  }
};

exports.listarProveedores = async (query = {}) => {
  const q = normalizeText(query.q);
  const where = {};

  if (String(query.activos) === "true") where.activo = true;
  if (String(query.activos) === "false") where.activo = false;

  if (q) {
    where[Op.or] = [
      { nombre: { [Op.iLike]: `%${q}%` } },
      { ruc: { [Op.iLike]: `%${q}%` } },
      { correo: { [Op.iLike]: `%${q}%` } },
      { telefono: { [Op.iLike]: `%${q}%` } },
    ];
  }

  const pageRaw = Number(query.page ?? 1);
  const pageSizeRaw = Number(query.pageSize ?? query.limit ?? 20);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.trunc(pageRaw) : 1;
  const pageSize = Number.isFinite(pageSizeRaw) && pageSizeRaw > 0
    ? Math.min(100, Math.trunc(pageSizeRaw))
    : 20;
  const offset = (page - 1) * pageSize;

  const { rows, count } = await models.Proveedor.findAndCountAll({
    where,
    order: [["nombre", "ASC"], ["id", "ASC"]],
    limit: pageSize,
    offset,
  });

  return {
    total: count,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(count / pageSize)),
    data: rows.map(mapProveedor),
  };
};
