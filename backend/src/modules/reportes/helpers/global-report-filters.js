const { Op } = require("sequelize");
const { models } = require("../../../db");

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function normStr(value) {
  if (value === undefined || value === null) return null;
  const out = String(value).trim();
  return out.length ? out : null;
}

function parseIds(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map(Number).filter((id) => Number.isInteger(id) && id > 0);
  }
  return String(value)
    .split(",")
    .map((item) => Number(String(item).trim()))
    .filter((id) => Number.isInteger(id) && id > 0);
}

function toYmd(date) {
  const value = new Date(date);
  const yyyy = value.getFullYear();
  const mm = String(value.getMonth() + 1).padStart(2, "0");
  const dd = String(value.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function defaultLast30DaysRange() {
  const today = new Date();
  const from = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
  return {
    desde: toYmd(from),
    hasta: toYmd(today),
    default_ultimos_30_dias: true,
  };
}

function buildDateFilter(field, desde, hasta) {
  if (!field) return {};
  if (desde && hasta) return { [field]: { [Op.between]: [desde, hasta] } };
  if (desde) return { [field]: { [Op.gte]: desde } };
  if (hasta) return { [field]: { [Op.lte]: hasta } };
  return {};
}

function dayDiff(from, to) {
  if (!from || !to) return null;
  const a = new Date(`${from}T00:00:00Z`).getTime();
  const b = new Date(`${to}T00:00:00Z`).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

function average(numbers = []) {
  const clean = numbers.filter((n) => Number.isFinite(Number(n))).map(Number);
  if (!clean.length) return 0;
  return clean.reduce((acc, current) => acc + current, 0) / clean.length;
}

function sum(values = []) {
  return values.reduce((acc, current) => acc + Number(current || 0), 0);
}

async function resolveGlobalFilters(query = {}) {
  const fromQuery = normStr(query.fecha_desde) || normStr(query.desde);
  const toQuery = normStr(query.fecha_hasta) || normStr(query.hasta);

  const fallback = defaultLast30DaysRange();
  const desde = fromQuery || fallback.desde;
  const hasta = toQuery || fallback.hasta;

  const fincaIds = (() => {
    const a = parseIds(query.finca_ids);
    const b = parseIds(query.finca_id);
    return a.length ? a : b;
  })();

  const fincas = fincaIds.length
    ? await models.Finca.findAll({
        where: { id: { [Op.in]: fincaIds } },
        attributes: ["id", "nombre", "estado"],
        order: [["nombre", "ASC"]],
        raw: true,
      })
    : await models.Finca.findAll({
        where: { estado: "Activo" },
        attributes: ["id", "nombre", "estado"],
        order: [["nombre", "ASC"]],
        raw: true,
      });

  if (!fincas.length) {
    throw badRequest("No hay fincas disponibles para el reporte.");
  }

  return {
    fincaIds: fincas.map((finca) => Number(finca.id)),
    fincas: fincas.map((finca) => ({
      id: Number(finca.id),
      nombre: finca.nombre,
      estado: finca.estado,
    })),
    desde,
    hasta,
    rangeInfo: {
      desde,
      hasta,
      default_ultimos_30_dias: !fromQuery && !toQuery,
    },
  };
}

function buildMeta(scope, globalFilters, extra = {}) {
  return {
    scope,
    filtros: {
      finca_ids: globalFilters.fincaIds,
      desde: globalFilters.desde,
      hasta: globalFilters.hasta,
      ...extra,
    },
    fincas: globalFilters.fincas,
  };
}

module.exports = {
  Op,
  average,
  badRequest,
  buildDateFilter,
  buildMeta,
  dayDiff,
  normStr,
  parseIds,
  resolveGlobalFilters,
  sum,
  toYmd,
};
