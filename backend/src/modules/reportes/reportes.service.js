// backend/src/modules/reportes/reportes.service.js
const { Op, fn, col, literal } = require("sequelize");
const { models } = require("../../db");

// helpers de error
function badRequest(msg) {
  const e = new Error(msg);
  e.status = 400;
  return e;
}

function normStr(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function normLower(v) {
  const s = normStr(v);
  return s ? s.toLowerCase() : null;
}

// ✅ helpers para rango por día (incluye día completo)
function startOfDay(ymd) {
  const d = new Date(ymd);
  d.setHours(0, 0, 0, 0);
  return d;
}
function nextDay(ymd) {
  const d = new Date(ymd);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  return d;
}

function parseIds(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(Number).filter(Boolean);
  return String(value)
    .split(",")
    .map((s) => Number(s.trim()))
    .filter(Boolean);
}

async function resolverCosechaId({ finca_id, cosecha_id, solo_cosecha_activa }) {
  if (cosecha_id) return Number(cosecha_id);

  const useActiva =
    solo_cosecha_activa === undefined || solo_cosecha_activa === null
      ? true
      : String(solo_cosecha_activa) === "true";

  if (!useActiva) return null;
  if (!finca_id) return null;

  const activa = await models.Cosecha.findOne({
    where: { finca_id: Number(finca_id), estado: "Activa" },
    attributes: ["id"],
  });

  return activa?.id || null;
}

// ===============================
// Builders (refactor)
// ===============================
function buildWhereBase({ estadoNorm, desdeNorm, hastaNorm, finalCosechaId }) {
  const where = {};
  if (estadoNorm) where.estado = estadoNorm;

  if (desdeNorm && hastaNorm) {
    where.fecha_programada = {
      [Op.gte]: startOfDay(desdeNorm),
      [Op.lt]: nextDay(hastaNorm),
    };
  } else if (desdeNorm) {
    where.fecha_programada = { [Op.gte]: startOfDay(desdeNorm) };
  } else if (hastaNorm) {
    where.fecha_programada = { [Op.lt]: nextDay(hastaNorm) };
  }

  if (finalCosechaId) where.cosecha_id = finalCosechaId;
  return where;
}

/**
 * include Lote con filtro de finca y opcionalmente incluir Finca (para UI en data[])
 */
function buildIncludeLoteData({ finca_id, loteIds, includeFinca = false }) {
  const inc = {
    model: models.Lote,
    attributes: ["id", "nombre", "finca_id"],
    where: {
      finca_id: Number(finca_id),
      ...(loteIds.length ? { id: { [Op.in]: loteIds } } : {}),
    },
  };

  if (includeFinca) {
    inc.include = [{ model: models.Finca, as: "finca", attributes: ["id", "nombre"] }];
  }

  return inc;
}

// ✅ PARA STATS: no traer columnas del Lote
function buildIncludeLoteStats({ finca_id, loteIds }) {
  return {
    model: models.Lote,
    attributes: [],
    required: true,
    where: {
      finca_id: Number(finca_id),
      ...(loteIds.length ? { id: { [Op.in]: loteIds } } : {}),
    },
  };
}

function buildIncludeTipoData({ tipoCodigo }) {
  return {
    model: models.TipoActividad,
    attributes: ["id", "codigo", "nombre"],
    ...(tipoCodigo ? { where: { codigo: tipoCodigo } } : {}),
  };
}

// ✅ PARA STATS: no traer columnas (evita GROUP BY error)
function buildIncludeTipoStats({ tipoCodigo }) {
  return {
    model: models.TipoActividad,
    attributes: [],
    required: true,
    ...(tipoCodigo ? { where: { codigo: tipoCodigo } } : {}),
  };
}

/**
 * Construye estadísticas del reporte (NO paginadas)
 * ✅ rellena con ceros: ranking_tareas, ranking_lotes, por_estado
 */
async function buildStats({
  where,
  includeLoteStats,
  includeTipoStats,
  totalFinca,
  finca_id,
  loteIds,
}) {
  // -----------------------------
  // Catálogos base (para rellenar ceros)
  // -----------------------------
  const allTipos = await models.TipoActividad.findAll({
    attributes: ["codigo", "nombre"],
    order: [["nombre", "ASC"]],
    raw: true,
  });

  const allLotes = await models.Lote.findAll({
    where: {
      finca_id: Number(finca_id),
      ...(loteIds.length ? { id: { [Op.in]: loteIds } } : {}),
    },
    attributes: ["id", "nombre"],
    order: [["nombre", "ASC"]],
    raw: true,
  });

  // -----------------------------
  // 1) Total por lote
  // -----------------------------
  const porLoteRows = await models.Tarea.findAll({
    where,
    include: [includeLoteStats, includeTipoStats],
    attributes: [
      [col("Lote.id"), "lote_id"],
      [col("Lote.nombre"), "lote"],
      [fn("COUNT", col("Tarea.id")), "total"],
    ],
    group: ["Lote.id", "Lote.nombre"],
    raw: true,
  });

  const mapLotes = new Map(
    porLoteRows.map((r) => [Number(r.lote_id), Number(r.total || 0)])
  );

  const por_lote_full = allLotes.map((l) => ({
    lote_id: Number(l.id),
    lote: String(l.nombre || ""),
    total: mapLotes.get(Number(l.id)) ?? 0,
  }));

  const por_lote = por_lote_full.sort((a, b) => b.total - a.total);
  const ranking_lotes = por_lote.slice(0, 10);

  // -----------------------------
  // 2) Ranking de tareas (por TipoActividad)
  // -----------------------------
  const rankingTareasRows = await models.Tarea.findAll({
    where,
    include: [includeLoteStats, includeTipoStats],
    attributes: [
      [col("TipoActividad.codigo"), "codigo"],
      [col("TipoActividad.nombre"), "nombre"],
      [fn("COUNT", col("Tarea.id")), "total"],
    ],
    group: ["TipoActividad.codigo", "TipoActividad.nombre"],
    raw: true,
  });

  const mapTareas = new Map(
    rankingTareasRows.map((r) => [String(r.codigo), Number(r.total || 0)])
  );

  const ranking_tareas_full = allTipos.map((t) => ({
    codigo: String(t.codigo || ""),
    nombre: String(t.nombre || ""),
    total: mapTareas.get(String(t.codigo)) ?? 0,
  }));

  const ranking_tareas = ranking_tareas_full
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // -----------------------------
  // 3) Tarea más realizada por lote
  // (si un lote tiene 0 tareas, no sale aquí, y está bien)
  // -----------------------------
  const porLoteTipoRows = await models.Tarea.findAll({
    where,
    include: [includeLoteStats, includeTipoStats],
    attributes: [
      [col("Lote.id"), "lote_id"],
      [col("Lote.nombre"), "lote"],
      [col("TipoActividad.codigo"), "tipo_codigo"],
      [col("TipoActividad.nombre"), "tipo_nombre"],
      [fn("COUNT", col("Tarea.id")), "total"],
    ],
    group: ["Lote.id", "Lote.nombre", "TipoActividad.codigo", "TipoActividad.nombre"],
    order: [[col("Lote.id"), "ASC"], [literal("total"), "DESC"]],
    raw: true,
  });

  const tarea_mas_realizada_por_lote = [];
  const seen = new Set();

  for (const r of porLoteTipoRows) {
    const loteId = Number(r.lote_id);
    if (seen.has(loteId)) continue;
    seen.add(loteId);

    tarea_mas_realizada_por_lote.push({
      lote_id: loteId,
      lote: String(r.lote || ""),
      tipo_codigo: String(r.tipo_codigo || ""),
      tipo_nombre: String(r.tipo_nombre || ""),
      total: Number(r.total || 0),
    });
  }

  // -----------------------------
  // 4) Distribución por estado (relleno con 0)
  // -----------------------------
  const ORDER_ESTADOS = [
    "Pendiente",
    "Asignada",
    "En progreso",
    "Completada",
    "Verificada",
    "Cancelada",
  ];

  const porEstadoRows = await models.Tarea.findAll({
    where,
    include: [
      { ...includeLoteStats, required: true },
      { ...includeTipoStats, required: true },
    ],
    attributes: [
      [col("Tarea.estado"), "estado"],
      [fn("COUNT", col("Tarea.id")), "total"],
    ],
    group: [col("Tarea.estado")],
    order: [
      [
        literal(`CASE
          WHEN "Tarea"."estado" = 'Pendiente' THEN 1
          WHEN "Tarea"."estado" = 'Asignada' THEN 2
          WHEN "Tarea"."estado" = 'En progreso' THEN 3
          WHEN "Tarea"."estado" = 'Completada' THEN 4
          WHEN "Tarea"."estado" = 'Verificada' THEN 5
          WHEN "Tarea"."estado" = 'Cancelada' THEN 6
          ELSE 99 END`),
        "ASC",
      ],
    ],
    raw: true,
  });

  const por_estado = {};
  for (const st of ORDER_ESTADOS) por_estado[st] = 0;
  for (const r of porEstadoRows) {
    por_estado[String(r.estado)] = Number(r.total || 0);
  }

  return {
    total_finca: Number(totalFinca || 0),
    por_lote,
    ranking_lotes,
    ranking_tareas,
    tarea_mas_realizada_por_lote,
    por_estado,
  };
}

//===============================================
// Reporte de Tareas
//===============================================
exports.reporteTareas = async (_currentUser, query) => {
  const {
    finca_id,
    lote_ids,
    cosecha_id,
    solo_cosecha_activa,
    tipo_codigo,
    estado,
    desde,
    hasta,
    page = 1,
    pageSize = 20,
  } = query;

  if (!finca_id) throw badRequest("finca_id es requerido para reportes.");

  const tipoCodigo = normLower(tipo_codigo);
  const estadoNorm = normStr(estado);
  const desdeNorm = normStr(desde);
  const hastaNorm = normStr(hasta);

  const loteIds = parseIds(lote_ids);

  const finalCosechaId = await resolverCosechaId({
    finca_id,
    cosecha_id,
    solo_cosecha_activa,
  });

  const where = buildWhereBase({
    estadoNorm,
    desdeNorm,
    hastaNorm,
    finalCosechaId,
  });

  // include para DATA (UI necesita finca.nombre)
  const includeLote = buildIncludeLoteData({
    finca_id,
    loteIds,
    includeFinca: true,
  });

  const includeTipo = buildIncludeTipoData({ tipoCodigo });

  // === Query principal (paginado) ===
  const { count, rows } = await models.Tarea.findAndCountAll({
    where,
    include: [
      includeTipo,
      includeLote,
      { model: models.Cosecha, attributes: ["id", "codigo", "nombre", "estado"] },
      { model: models.PeriodoCosecha, attributes: ["id", "nombre"], required: false },
      { model: models.Usuario, as: "Creador", attributes: ["id", "nombres", "apellidos"] },
      {
        model: models.TareaAsignacion,
        required: false,
        include: [{ model: models.Usuario, attributes: ["id", "nombres", "apellidos", "tipo"] }],
      },
      {
        model: models.TareaItem,
        required: false,
        include: [
          { model: models.InventarioItem, attributes: ["id", "nombre", "categoria"] },
          { model: models.Unidad, attributes: ["codigo"] },
        ],
      },
    ],
    order: [["fecha_programada", "DESC"]],
    limit: Number(pageSize),
    offset: (Number(page) - 1) * Number(pageSize),
    distinct: true,
  });

  // Header “bonito”
  const finca = await models.Finca.findByPk(Number(finca_id), { attributes: ["id", "nombre"] });

  const header = {
    finca: finca ? { id: Number(finca.id), nombre: finca.nombre } : null,
    lotes: loteIds.length ? loteIds.map(Number) : "Todos",
    cosecha_id: finalCosechaId ? Number(finalCosechaId) : null,
    tipo_codigo: tipoCodigo || "Todos",
    rango: { desde: desdeNorm || null, hasta: hastaNorm || null },
    total_tareas: Number(count),
  };

  const data = rows.map((t) => {
    const j = t.toJSON();
    return {
      id: Number(j.id),
      fecha_programada: j.fecha_programada,
      estado: j.estado,
      titulo: j.titulo,
      finca: j.Lote?.finca?.nombre,
      lote: j.Lote?.nombre,
      cosecha: j.Cosecha?.codigo,
      cosecha_estado: j.Cosecha?.estado,
      tipo: j.TipoActividad?.codigo,
      creador: j.Creador ? `${j.Creador.nombres} ${j.Creador.apellidos}` : null,
      detalles: j.detalles || {},
      asignados: (j.TareaAsignacions || []).map((a) => ({
        id: a.Usuario?.id,
        nombre: a.Usuario ? `${a.Usuario.nombres} ${a.Usuario.apellidos}` : "Usuario",
        tipo: a.Usuario?.tipo,
        rol_en_tarea: a.rol_en_tarea,
      })),
      items: (j.TareaItems || []).map((i) => ({
        nombre: i.InventarioItem?.nombre,
        categoria: i.categoria,
        unidad: i.Unidad?.codigo,
        cantidad_planificada: i.cantidad_planificada,
        cantidad_real: i.cantidad_real,
      })),
    };
  });

  const ps = Number(pageSize);
  const totalPages = Math.max(1, Math.ceil(count / ps));

  // === Stats (NO paginadas, mismo universo filtrado) ===
  const includeLoteStats = buildIncludeLoteStats({ finca_id, loteIds });
  const includeTipoStats = buildIncludeTipoStats({ tipoCodigo });

  const stats = await buildStats({
    where,
    includeLoteStats,
    includeTipoStats,
    totalFinca: Number(count),
    finca_id,
    loteIds,
  });

  return {
    header,
    stats,
    page: Number(page),
    pageSize: ps,
    total: Number(count),
    totalPages,
    data,
  };
};
