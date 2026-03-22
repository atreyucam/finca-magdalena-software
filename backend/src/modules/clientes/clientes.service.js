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

function notFound(message = "No encontrado") {
  const e = new Error(message);
  e.status = 404;
  e.code = "NOT_FOUND";
  return e;
}

function normalizeText(value, { upper = false } = {}) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return upper ? text.toUpperCase() : text;
}

function normalizeIdentificacion(raw) {
  const value = normalizeText(raw, { upper: true });
  if (!value) return null;

  const simple = /^[A-Z0-9-]+$/;
  if (!simple.test(value) || value.length < 5 || value.length > 20) {
    throw badRequest("Identificacion/RUC invalido");
  }

  const digitsOnly = /^\d+$/.test(value);
  if (digitsOnly && ![10, 13].includes(value.length)) {
    throw badRequest("Identificacion numerica invalida: debe tener 10 o 13 digitos");
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

function mapCliente(row) {
  return {
    id: row.id,
    nombre: row.nombre,
    identificacion: row.identificacion,
    telefono: row.telefono,
    correo: row.correo,
    direccion: row.direccion,
    activo: row.activo,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function contarFacturasCliente(clienteId) {
  const total = await models.Venta.count({
    where: { cliente_id: clienteId },
  });
  return Number(total || 0);
}

async function enrichCliente(row) {
  const cliente = mapCliente(row);
  const facturasRegistradas = await contarFacturasCliente(row.id);
  return {
    ...cliente,
    facturas_registradas: facturasRegistradas,
    puede_eliminar: facturasRegistradas === 0,
    puede_desactivar: facturasRegistradas > 0 && cliente.activo,
  };
}

exports.crearCliente = async (payload = {}) => {
  const nombre = normalizeText(payload.nombre);
  if (!nombre) throw badRequest("Nombre o razon social es obligatorio");

  const data = {
    nombre,
    identificacion: normalizeIdentificacion(payload.identificacion ?? payload.ruc),
    telefono: normalizePhone(payload.telefono),
    correo: normalizeEmail(payload.correo),
    direccion: normalizeText(payload.direccion),
    activo: payload.activo === false ? false : true,
  };

  try {
    const row = await models.Cliente.create(data);
    return mapCliente(row);
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      throw conflict("Ya existe un cliente con esa identificacion/RUC");
    }
    throw error;
  }
};

exports.editarCliente = async (id, payload = {}) => {
  const clienteId = Number(id);
  if (!Number.isInteger(clienteId) || clienteId <= 0) throw badRequest("ID de cliente invalido");

  const row = await models.Cliente.findByPk(clienteId);
  if (!row) throw notFound("Cliente no encontrado");

  if (Object.prototype.hasOwnProperty.call(payload, "nombre")) {
    const nombre = normalizeText(payload.nombre);
    if (!nombre) throw badRequest("Nombre o razon social es obligatorio");
    row.nombre = nombre;
  }

  if (
    Object.prototype.hasOwnProperty.call(payload, "identificacion") ||
    Object.prototype.hasOwnProperty.call(payload, "ruc")
  ) {
    row.identificacion = normalizeIdentificacion(payload.identificacion ?? payload.ruc);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "telefono")) {
    row.telefono = normalizePhone(payload.telefono);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "correo")) {
    row.correo = normalizeEmail(payload.correo);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "direccion")) {
    row.direccion = normalizeText(payload.direccion);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "activo")) {
    row.activo = payload.activo === false ? false : true;
  }

  try {
    await row.save();
    return enrichCliente(row);
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      throw conflict("Ya existe un cliente con esa identificacion/RUC");
    }
    throw error;
  }
};

exports.listarClientes = async (query = {}) => {
  const q = normalizeText(query.q);
  const where = {};

  if (String(query.activos) === "true") where.activo = true;
  if (String(query.activos) === "false") where.activo = false;

  if (q) {
    where[Op.or] = [
      { nombre: { [Op.iLike]: `%${q}%` } },
      { identificacion: { [Op.iLike]: `%${q}%` } },
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

  const { rows, count } = await models.Cliente.findAndCountAll({
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
    data: rows.map(mapCliente),
  };
};

exports.obtenerCliente = async (id) => {
  const clienteId = Number(id);
  if (!Number.isInteger(clienteId) || clienteId <= 0) throw badRequest("ID de cliente invalido");

  const row = await models.Cliente.findByPk(clienteId);
  if (!row) throw notFound("Cliente no encontrado");
  return enrichCliente(row);
};

exports.desactivarCliente = async (id) => {
  const clienteId = Number(id);
  if (!Number.isInteger(clienteId) || clienteId <= 0) throw badRequest("ID de cliente invalido");

  const row = await models.Cliente.findByPk(clienteId);
  if (!row) throw notFound("Cliente no encontrado");

  const facturasRegistradas = await contarFacturasCliente(clienteId);
  if (facturasRegistradas === 0) {
    throw conflict("Este cliente no tiene facturas registradas. Debe eliminarse en lugar de desactivarse");
  }

  if (!row.activo) {
    return enrichCliente(row);
  }

  row.activo = false;
  await row.save();
  return enrichCliente(row);
};

exports.eliminarCliente = async (id) => {
  const clienteId = Number(id);
  if (!Number.isInteger(clienteId) || clienteId <= 0) throw badRequest("ID de cliente invalido");

  const row = await models.Cliente.findByPk(clienteId);
  if (!row) throw notFound("Cliente no encontrado");

  const facturasRegistradas = await contarFacturasCliente(clienteId);
  if (facturasRegistradas > 0) {
    throw conflict("No se puede eliminar un cliente con facturas registradas. Debes desactivarlo");
  }

  await row.destroy();
  return { ok: true, id: clienteId };
};
