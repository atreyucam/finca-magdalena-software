// backend/src/modules/reportes/reportes.service.js
const { Op, fn, col, literal, QueryTypes } = require("sequelize");
const { models } = require("../../db");


// 👇 sacamos la instancia sequelize desde cualquier modelo existente
const sequelize = models?.Tarea?.sequelize || models?.Cosecha?.sequelize;

if (!sequelize) {
  throw new Error("DB no expone instancia sequelize: no se pudo obtener models.Tarea.sequelize");
}

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

// ✅ parse num seguro
function normPosInt(v, def) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : def;
}

// ✅ búsqueda ILIKE
function buildWhereItemBase({ categoria, q }) {
  const where = { activo: true };

  if (categoria && ["Insumo","Herramienta","Equipo"].includes(categoria)) {
    where.categoria = categoria;
  }

  const qq = normStr(q);
  if (qq) where.nombre = { [Op.iLike]: `%${qq}%` };

  return where;
}

function buildStockEstadoWhere({ estado_stock }) {
  const st = normLower(estado_stock);

  // stock_actual y stock_minimo son DECIMAL -> comparaciones funcionan en SQL
  if (st === "critico") return literal(`"InventarioItem"."stock_actual" <= 0`);
  if (st === "bajo_minimo") return literal(`"InventarioItem"."stock_actual" > 0 AND "InventarioItem"."stock_actual" <= "InventarioItem"."stock_minimo"`);
  if (st === "ok") return literal(`"InventarioItem"."stock_actual" > "InventarioItem"."stock_minimo"`);
  return null;
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



// ===============================
// 1) RESUMEN (cards)
// ===============================
exports.reporteInventarioResumen = async (_currentUser, query) => {
  const categoria = normStr(query?.categoria);
  const q = normStr(query?.q);

  const desde = normStr(query?.desde);
  const hasta = normStr(query?.hasta);

  // Base items
  const whereItems = buildWhereItemBase({ categoria, q });

  // 1) críticos / bajo mínimo
  const [criticos, bajoMinimo] = await Promise.all([
    models.InventarioItem.count({
      where: {
        ...whereItems,
        [Op.and]: [literal(`"InventarioItem"."stock_actual" <= 0`)],
      }
    }),
    models.InventarioItem.count({
      where: {
        ...whereItems,
        [Op.and]: [literal(`"InventarioItem"."stock_actual" > 0 AND "InventarioItem"."stock_actual" <= "InventarioItem"."stock_minimo"`)],
      }
    }),
  ]);

  // 2) FEFO (30 días por defecto)
  const fefoDias = normPosInt(query?.fefo_dias, 30);
  const hoy = new Date();
  const hastaFefo = new Date(hoy);
  hastaFefo.setDate(hastaFefo.getDate() + fefoDias);

  const fefoWhere = {
    activo: true,
    cantidad_actual: { [Op.gt]: 0 },
    fecha_vencimiento: {
      [Op.ne]: null,
      [Op.lte]: hastaFefo,
    }
  };

  // si filtras categoria != Insumo, FEFO debe ser 0
  const lotesPorVencer = (categoria && categoria !== "Insumo")
    ? 0
    : await models.InventarioLote.count({
        where: fefoWhere,
        include: [{
          model: models.InventarioItem,
          required: true,
          where: whereItems, // respeta categoria/q (si categoria=Insumo ok)
          attributes: [],
        }]
      });

  // 3) préstamos activos (solo herramienta/equipo, pero si categoria=Insumo da 0)
  const prestamosActivos = (categoria && categoria === "Insumo")
    ? 0
    : await models.HerramientaPrestamo.count({
        where: { estado: "Prestada" },
        include: [{
          model: models.InventarioItem,
          required: true,
          where: whereItems,
          attributes: [],
        }]
      });

  // 4) movimientos: entradas/salidas en rango (opcional)
  const whereMov = {};
  if (desde && hasta) {
    whereMov.fecha = { [Op.gte]: startOfDay(desde), [Op.lt]: nextDay(hasta) };
  } else if (desde) {
    whereMov.fecha = { [Op.gte]: startOfDay(desde) };
  } else if (hasta) {
    whereMov.fecha = { [Op.lt]: nextDay(hasta) };
  }

  // Si quieres separar entradas vs salidas
  const [movEntradas, movSalidas] = await Promise.all([
    models.InventarioMovimiento.count({
      where: {
        ...whereMov,
        tipo: { [Op.in]: ["ENTRADA","AJUSTE_ENTRADA","PRESTAMO_DEVUELTA"] }
      }
    }),
    models.InventarioMovimiento.count({
      where: {
        ...whereMov,
        tipo: { [Op.in]: ["SALIDA","AJUSTE_SALIDA","PRESTAMO_SALIDA","BAJA"] }
      }
    }),
  ]);

  return {
    header: {
      categoria: categoria || "Todas",
      q: q || null,
      fefo_dias: fefoDias,
      rango_movimientos: { desde: desde || null, hasta: hasta || null },
      nota: "Inventario es global (no está ligado a finca/lote en el esquema actual)."
    },
    stats: {
      items_sin_stock: Number(criticos || 0),
      items_bajo_minimo: Number(bajoMinimo || 0),
      lotes_por_vencer: Number(lotesPorVencer || 0),
      prestamos_activos: Number(prestamosActivos || 0),
      movimientos_entradas: Number(movEntradas || 0),
      movimientos_salidas: Number(movSalidas || 0),
    }
  };
};

// ===============================
// 2) STOCK (tabla por ítem)
// ===============================
exports.reporteInventarioStock = async (_currentUser, query) => {
  const categoria = normStr(query?.categoria);
  const q = normStr(query?.q);
  const estado_stock = normStr(query?.estado_stock);

  const page = normPosInt(query?.page, 1);
  const pageSize = normPosInt(query?.pageSize, 20);

  const whereItems = buildWhereItemBase({ categoria, q });
  const estadoLiteral = buildStockEstadoWhere({ estado_stock });

  const where = {
    ...whereItems,
    ...(estadoLiteral ? { [Op.and]: [estadoLiteral] } : {}),
  };

  const { count, rows } = await models.InventarioItem.findAndCountAll({
    where,
    include: [{ model: models.Unidad, attributes: ["codigo","nombre"] }],
    attributes: {
      include: [
        // último movimiento (fecha + tipo) por subquery
        [literal(`(
          SELECT MAX(m.fecha)
          FROM inventario_movimientos m
          WHERE m.item_id = "InventarioItem"."id"
        )`), "ultimo_mov_fecha"],
        [literal(`(
          SELECT m2.tipo
          FROM inventario_movimientos m2
          WHERE m2.item_id = "InventarioItem"."id"
          ORDER BY m2.fecha DESC
          LIMIT 1
        )`), "ultimo_mov_tipo"],
      ]
    },
    order: [
      // críticos y bajo mínimo primero (para UX)
      [literal(`CASE
        WHEN "InventarioItem"."stock_actual" <= 0 THEN 1
        WHEN "InventarioItem"."stock_actual" > 0 AND "InventarioItem"."stock_actual" <= "InventarioItem"."stock_minimo" THEN 2
        ELSE 3 END`), "ASC"],
      ["nombre", "ASC"],
    ],
    limit: pageSize,
    offset: (page - 1) * pageSize,
    distinct: true,
  });

  const data = rows.map((r) => {
    const j = r.toJSON();
    const stock = Number(j.stock_actual);
    const min = Number(j.stock_minimo);

    let estado = "OK";
    if (stock <= 0) estado = "Sin stock";
    else if (stock <= min) estado = "Bajo mínimo";

    return {
      id: Number(j.id),
      nombre: j.nombre,
      categoria: j.categoria,
      unidad: j.Unidad?.codigo || null,
      stock_actual: j.stock_actual,
      stock_minimo: j.stock_minimo,
      estado,
      ultimo_movimiento: j.ultimo_mov_fecha
        ? { fecha: j.ultimo_mov_fecha, tipo: j.ultimo_mov_tipo || null }
        : null,
    };
  });

  const totalPages = Math.max(1, Math.ceil(Number(count) / pageSize));

  return {
    header: { categoria: categoria || "Todas", q: q || null, estado_stock: estado_stock || "Todos" },
    page,
    pageSize,
    total: Number(count),
    totalPages,
    data,
  };
};

// ===============================
// 3) FEFO (tabla por lote)
// ===============================
exports.reporteInventarioFefo = async (_currentUser, query) => {
  const categoria = normStr(query?.categoria);
  const q = normStr(query?.q);
  const fefoDias = normPosInt(query?.fefo_dias, 30);

  const page = normPosInt(query?.page, 1);
  const pageSize = normPosInt(query?.pageSize, 20);

  // si piden categoria distinta de Insumo => no aplica
  if (categoria && categoria !== "Insumo") {
    return {
      header: { categoria, q: q || null, fefo_dias: fefoDias, nota: "FEFO solo aplica a Insumos." },
      page, pageSize, total: 0, totalPages: 1,
      data: [],
    };
  }

  const hoy = new Date();
  const hastaFefo = new Date(hoy);
  hastaFefo.setDate(hastaFefo.getDate() + fefoDias);

  const whereLote = {
    activo: true,
    cantidad_actual: { [Op.gt]: 0 },
    fecha_vencimiento: { [Op.ne]: null, [Op.lte]: hastaFefo },
  };

  const whereItem = buildWhereItemBase({ categoria: "Insumo", q });

  const { count, rows } = await models.InventarioLote.findAndCountAll({
    where: whereLote,
    include: [{
      model: models.InventarioItem,
      required: true,
      where: whereItem,
      attributes: ["id","nombre","categoria"],
      include: [{ model: models.Unidad, attributes: ["codigo","nombre"] }],
    }],
    order: [["fecha_vencimiento", "ASC"], ["id", "ASC"]],
    limit: pageSize,
    offset: (page - 1) * pageSize,
    distinct: true,
  });

  const data = rows.map((r) => {
    const j = r.toJSON();
    const fv = j.fecha_vencimiento ? new Date(j.fecha_vencimiento) : null;
    const dias = fv ? Math.ceil((fv.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)) : null;

    return {
      id: Number(j.id),
      item: { id: Number(j.InventarioItem?.id), nombre: j.InventarioItem?.nombre },
      unidad: j.InventarioItem?.Unidad?.codigo || null,
      codigo_lote_proveedor: j.codigo_lote_proveedor || null,
      fecha_vencimiento: j.fecha_vencimiento,
      dias_restantes: dias,
      cantidad_actual: j.cantidad_actual,
    };
  });

  const totalPages = Math.max(1, Math.ceil(Number(count) / pageSize));

  return {
    header: { categoria: "Insumo", q: q || null, fefo_dias: fefoDias },
    page,
    pageSize,
    total: Number(count),
    totalPages,
    data,
  };
};

// ===============================
// 4) PRÉSTAMOS (tabla)
// ===============================
exports.reporteInventarioPrestamos = async (_currentUser, query) => {
  const categoria = normStr(query?.categoria);
  const q = normStr(query?.q);

  const page = normPosInt(query?.page, 1);
  const pageSize = normPosInt(query?.pageSize, 20);

  // Insumo no aplica
  if (categoria && categoria === "Insumo") {
    return {
      header: { categoria, q: q || null, nota: "Préstamos aplican a Herramientas/Equipos." },
      page, pageSize, total: 0, totalPages: 1,
      data: [],
    };
  }

  const whereItem = buildWhereItemBase({ categoria, q });

  const { count, rows } = await models.HerramientaPrestamo.findAndCountAll({
    where: { estado: "Prestada" },
    include: [
      { model: models.InventarioItem, required: true, where: whereItem, attributes: ["id","nombre","categoria"] },
      { model: models.Usuario, required: true, attributes: ["id","nombres","apellidos","tipo"] },
    ],
    attributes: {
      include: [
        [literal(`DATE_PART('day', NOW() - "HerramientaPrestamo"."fecha_salida")`), "dias_prestado"]
      ]
    },
    order: [["fecha_salida", "DESC"]],
    limit: pageSize,
    offset: (page - 1) * pageSize,
    distinct: true,
  });

  const data = rows.map((r) => {
    const j = r.toJSON();
    return {
      id: Number(j.id),
      item: { id: Number(j.InventarioItem?.id), nombre: j.InventarioItem?.nombre, categoria: j.InventarioItem?.categoria },
      usuario: j.Usuario ? { id: Number(j.Usuario.id), nombre: `${j.Usuario.nombres} ${j.Usuario.apellidos}`, tipo: j.Usuario.tipo } : null,
      fecha_salida: j.fecha_salida,
      dias_prestado: j.dias_prestado !== undefined && j.dias_prestado !== null ? Number(j.dias_prestado) : null,
      estado: j.estado,
    };
  });

  const totalPages = Math.max(1, Math.ceil(Number(count) / pageSize));

  return {
    header: { categoria: categoria || "Herramienta/Equipo", q: q || null, estado: "Prestada" },
    page,
    pageSize,
    total: Number(count),
    totalPages,
    data,
  };
};





// Helpers
// =====================
const toInt = (v, def = null) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

const toBool = (v, def = false) => {
  if (v === undefined || v === null) return def;
  if (typeof v === "boolean") return v;
  const s = String(v).toLowerCase().trim();
  if (["1", "true", "yes", "si"].includes(s)) return true;
  if (["0", "false", "no"].includes(s)) return false;
  return def;
};

const sumAjustes = (ajustes) => {
  if (!Array.isArray(ajustes)) return 0;
  // ✅ asumimos descuentos vienen con monto negativo
  return ajustes.reduce((acc, a) => acc + Number(a?.monto || 0), 0);
};

const normalizeDayLabel = (s) => {
  const x = String(s || "").trim();
  if (!x) return null;
  const map = { Mie: "Mié" };
  return map[x] || x;
};

const daysOrder = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

// ✅ Parser filtros
function parseManoObraFilters(q) {
  const desde = q.desde ? String(q.desde) : null; // YYYY-MM-DD
  const hasta = q.hasta ? String(q.hasta) : null;

  const estado = q.estado ? String(q.estado) : null; // Borrador|Aprobada
  const trabajador_id = toInt(q.trabajador_id, null);
  const metodo_pago = q.metodo_pago ? String(q.metodo_pago) : null;
  const incluir_excluidos = toBool(q.incluir_excluidos, false);

  return { desde, hasta, estado, trabajador_id, metodo_pago, incluir_excluidos };
}

function buildManoObraQuery(filters) {
  const whereSemana = {};
  const whereDetalle = {};

  // Rango por semana (lo más consistente)
  if (filters.desde) whereSemana.fecha_inicio = { ...(whereSemana.fecha_inicio || {}), [Op.gte]: filters.desde };
  if (filters.hasta) whereSemana.fecha_fin = { ...(whereSemana.fecha_fin || {}), [Op.lte]: filters.hasta };

  if (filters.estado) whereSemana.estado = filters.estado;

  if (filters.trabajador_id) whereDetalle.trabajador_id = filters.trabajador_id;
  if (filters.metodo_pago) whereDetalle.metodo_pago = filters.metodo_pago;
  if (!filters.incluir_excluidos) whereDetalle.excluido = false;

  return { whereSemana, whereDetalle };
}

// =====================
// DASHBOARD
// =====================
exports.reporteManoObraResumen = async (currentUser, query) => {
  const filters = parseManoObraFilters(query);
  const { whereSemana, whereDetalle } = buildManoObraQuery(filters);

  const semanas = await models.NominaSemana.findAll({
    where: whereSemana,
    attributes: ["id", "semana_iso", "fecha_inicio", "fecha_fin", "estado"],
    include: [
      {
        model: models.NominaDetalle,
        required: true,
        where: whereDetalle,
        attributes: ["id", "trabajador_id", "monto_base", "monto_total", "ajustes", "metodo_pago", "dias"],
        include: [{ model: models.Usuario, as: "Trabajador", attributes: ["id", "nombres", "apellidos", "cedula"] }]
      }
    ],
    order: [["fecha_inicio", "ASC"]]
  });

  let monto_base = 0;
  let monto_total = 0;
  let ajustes_pos = 0;
  let ajustes_neg = 0;

  const trabajadoresSet = new Set();
  const pagosRegistros = [];

  const totalPorSemana = new Map();
  const baseAjustesTotal = new Map();
  const metodoPagoAgg = new Map();
  const topTrab = new Map();
  const diasSemanaAgg = new Map(daysOrder.map((d) => [d, 0]));

  for (const s of semanas) {
    const semanaIso = s.semana_iso;
    const inicio = s.fecha_inicio;
    const fin = s.fecha_fin;

    if (!baseAjustesTotal.has(semanaIso)) {
      baseAjustesTotal.set(semanaIso, { semana_iso: semanaIso, inicio, fin, base: 0, ajustes: 0, total: 0 });
      totalPorSemana.set(semanaIso, { semana_iso: semanaIso, inicio, fin, total: 0 });
    }

    // 👇 Sequelize normalmente expone array como NominaDetalles
    const detalles = s.NominaDetalles || [];

    for (const d of detalles) {
      pagosRegistros.push(d.id);
      trabajadoresSet.add(d.trabajador_id);

      const base = Number(d.monto_base || 0);
      const total = Number(d.monto_total || 0);
      const aj = sumAjustes(d.ajustes);

      monto_base += base;
      monto_total += total;
      if (aj >= 0) ajustes_pos += aj;
      else ajustes_neg += aj;

      const x1 = baseAjustesTotal.get(semanaIso);
      x1.base += base;
      x1.ajustes += aj;
      x1.total += total;

      const x2 = totalPorSemana.get(semanaIso);
      x2.total += total;

      const mp = d.metodo_pago || "Efectivo";
      const mpAgg = metodoPagoAgg.get(mp) || { metodo: mp, count: 0, total: 0 };
      mpAgg.count += 1;
      mpAgg.total += total;
      metodoPagoAgg.set(mp, mpAgg);

      const t = d.Trabajador;
      const nombre = t ? `${t.nombres} ${t.apellidos}` : `Trabajador #${d.trabajador_id}`;
      const tt = topTrab.get(d.trabajador_id) || { trabajador_id: d.trabajador_id, nombre, total: 0 };
      tt.total += total;
      topTrab.set(d.trabajador_id, tt);

      if (Array.isArray(d.dias)) {
        for (const raw of d.dias) {
          const dia = normalizeDayLabel(raw);
          if (!dia) continue;
          diasSemanaAgg.set(dia, (diasSemanaAgg.get(dia) || 0) + 1);
        }
      }
    }
  }

  const series_total_por_semana = Array.from(totalPorSemana.values()).map((x) => ({
    semana_iso: x.semana_iso,
    inicio: x.inicio,
    fin: x.fin,
    total: Number(x.total.toFixed(2))
  }));

  const barras_base_ajustes_total = Array.from(baseAjustesTotal.values()).map((x) => ({
    semana_iso: x.semana_iso,
    base: Number(x.base.toFixed(2)),
    ajustes: Number(x.ajustes.toFixed(2)),
    total: Number(x.total.toFixed(2))
  }));

  const metodos_pago = Array.from(metodoPagoAgg.values())
    .sort((a, b) => b.total - a.total)
    .map((x) => ({ metodo: x.metodo, count: x.count, total: Number(x.total.toFixed(2)) }));

  const top_trabajadores = Array.from(topTrab.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)
    .map((x) => ({ ...x, total: Number(x.total.toFixed(2)) }));

  const dias_semana = daysOrder.map((dia) => ({ dia, count: diasSemanaAgg.get(dia) || 0 }));

  return {
    kpis: {
      semanas: semanas.length,
      trabajadores_unicos: trabajadoresSet.size,
      pagos_registros: pagosRegistros.length,
      monto_base: Number(monto_base.toFixed(2)),
      ajustes_positivos: Number(ajustes_pos.toFixed(2)),
      ajustes_negativos: Number(ajustes_neg.toFixed(2)),
      ajustes_neto: Number((ajustes_pos + ajustes_neg).toFixed(2)),
      monto_total: Number(monto_total.toFixed(2))
    },
    series_total_por_semana,
    barras_base_ajustes_total,
    metodos_pago,
    top_trabajadores,
    dias_semana
  };
};

// =====================
// DETALLE (tabla paginada)
// =====================
exports.reporteManoObraDetallado = async (currentUser, query) => {
  const filters = parseManoObraFilters(query);
  const { whereSemana, whereDetalle } = buildManoObraQuery(filters);

  const page = Math.max(1, toInt(query.page, 1));
  const limit = Math.min(100, Math.max(1, toInt(query.limit, 10)));
  const offset = (page - 1) * limit;

  const { count, rows } = await models.NominaDetalle.findAndCountAll({
    where: whereDetalle,
    attributes: [
      "id",
      "nomina_id",
      "trabajador_id",
      "tareas_completadas",
      "dias_laborados",
      "dias",
      "monto_base",
      "ajustes",
      "monto_total",
      "observaciones",
      "excluido",
      "metodo_pago",
      "metodo_pago_otro",
      "comprobante",
      "moneda",
      "created_at"
    ],
    include: [
      {
        model: models.NominaSemana,
        required: true,
        where: whereSemana,
        attributes: ["id", "semana_iso", "fecha_inicio", "fecha_fin", "estado"]
      },
      { model: models.Usuario, as: "Trabajador", attributes: ["id", "cedula", "nombres", "apellidos"] }
    ],
    order: [[models.NominaSemana, "fecha_inicio", "DESC"], ["monto_total", "DESC"]],
    limit,
    offset
  });

  return {
    meta: { page, limit, total: count },
    rows: rows.map((d) => {
      const aj = sumAjustes(d.ajustes);
      return {
        detalle_id: d.id,
        trabajador: d.Trabajador
          ? { id: d.Trabajador.id, cedula: d.Trabajador.cedula, nombres: d.Trabajador.nombres, apellidos: d.Trabajador.apellidos }
          : null,
        semana: d.NominaSemana
          ? { id: d.NominaSemana.id, semana_iso: d.NominaSemana.semana_iso, fecha_inicio: d.NominaSemana.fecha_inicio, fecha_fin: d.NominaSemana.fecha_fin, estado: d.NominaSemana.estado }
          : null,

        tareas_completadas: d.tareas_completadas,
        dias_laborados: d.dias_laborados,
        dias: d.dias || [],

        monto_base: Number(d.monto_base || 0),
        ajustes: d.ajustes || [],
        ajustes_neto: Number(aj.toFixed(2)),
        monto_total: Number(d.monto_total || 0),

        metodo_pago: d.metodo_pago,
        metodo_pago_otro: d.metodo_pago_otro,
        comprobante: d.comprobante,

        observaciones: d.observaciones,
        excluido: d.excluido,
        moneda: d.moneda
      };
    })
  };
};




// !===========================================================================================
// !cosechas reportes
// !===========================================================================================


const ESTADOS_VALIDOS = ["Completada", "Verificada"];

const toYmd = (v) => {
  if (!v) return null;
  const d = new Date(v);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const parseRange = (q) => {
  const hoy = new Date();
  const hasta = q.hasta ? new Date(q.hasta) : hoy;
  const desde = q.desde
    ? new Date(q.desde)
    : new Date(hasta.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { desde: toYmd(desde), hasta: toYmd(hasta) };
};

// cache en memoria (evita consultar DB cada request)
let _tipoCosechaIdCache = null;

const getTipoCosechaId = async () => {
  if (_tipoCosechaIdCache) return _tipoCosechaIdCache;

  // 1) primero por codigo (lo más seguro)
  const row = await models.TipoActividad.findOne({
    where: { codigo: "COSECHA" },
    attributes: ["id", "codigo", "nombre"],
    raw: true,
  });

  // 2) fallback por nombre por si el codigo no existe
  if (!row) {
    const row2 = await models.TipoActividad.findOne({
      where: sequelize.where(
        sequelize.fn("lower", sequelize.col("nombre")),
        "cosecha"
      ),
      attributes: ["id", "codigo", "nombre"],
      raw: true,
    });

    if (!row2) {
      const err = new Error("No existe TipoActividad 'COSECHA' en tipos_actividad.");
      err.status = 500;
      throw err;
    }

    _tipoCosechaIdCache = Number(row2.id);
    return _tipoCosechaIdCache;
  }

  _tipoCosechaIdCache = Number(row.id);
  return _tipoCosechaIdCache;
};
// Base WHERE común
const buildWhere = ({ finca_id, cosecha_id, lote_id, desde, hasta }) => {
  if (!finca_id) {
    const err = new Error("finca_id es requerido");
    err.status = 400;
    throw err;
  }

  // usamos fecha_fin_real si existe, si no fecha_programada
  // para filtrar por rango
  return {
    finca_id: Number(finca_id),
    cosecha_id: cosecha_id ? Number(cosecha_id) : null,
    lote_id: lote_id ? Number(lote_id) : null,
    desde,
    hasta,
  };
};

// =======================
// 1) RESUMEN KPI
// =======================
exports.reporteProduccionResumen = async (currentUser, query) => {
  const tipoCosechaId = await getTipoCosechaId();
  const { desde, hasta } = parseRange(query);
  const p = buildWhere({ ...query, desde, hasta });

  const sql = `
    WITH base AS (
      SELECT
        t.id,
        l.finca_id,
        t.cosecha_id,
        t.lote_id,
        COALESCE(t.fecha_fin_real, t.fecha_programada)::date AS fecha_reporte,
        t.detalles
      FROM tareas t
      JOIN lotes l ON l.id = t.lote_id
      WHERE
        t.tipo_id = :tipoCosecha
        AND t.estado  IN (:estados)
        AND l.finca_id = :fincaId
        AND (:cosechaId::bigint IS NULL OR t.cosecha_id = :cosechaId)
        AND (:loteId::bigint   IS NULL OR t.lote_id   = :loteId)
        AND COALESCE(t.fecha_fin_real, t.fecha_programada)::date BETWEEN :desde::date AND :hasta::date
    ),
    rech AS (
      SELECT
        SUM( COALESCE( (r->>'kg')::numeric, 0 ) ) AS kg_rechazo
      FROM base b
      LEFT JOIN LATERAL jsonb_array_elements(COALESCE(b.detalles->'rechazos','[]'::jsonb)) r ON true
    ),
    clas AS (
      SELECT
        SUM( COALESCE( (c->>'kg')::numeric, 0 ) ) AS kg_clasif
      FROM base b
      LEFT JOIN LATERAL jsonb_array_elements(COALESCE(b.detalles->'clasificacion','[]'::jsonb)) c ON true
    ),
    logi AS (
      SELECT
        SUM( COALESCE( (b.detalles->'entrega'->>'gabetas_entregadas')::numeric, 0) ) AS g_ent,
        SUM( COALESCE( (b.detalles->'entrega'->>'gabetas_devueltas')::numeric, 0) ) AS g_dev
      FROM base b
    )
    SELECT
      f.id AS finca_id,
      f.nombre AS finca_nombre,
      COALESCE(SUM( (b.detalles->>'kg_planificados')::numeric ),0) AS kg_planificados,
      COALESCE(SUM( (b.detalles->>'kg_cosechados')::numeric ),0) AS kg_cosechados,
      COALESCE((SELECT kg_rechazo FROM rech),0) AS kg_rechazo,
      COALESCE((SELECT g_ent FROM logi),0) AS gabetas_entregadas,
      COALESCE((SELECT g_dev FROM logi),0) AS gabetas_devueltas,
      COALESCE(SUM( (b.detalles->>'total_dinero')::numeric ),0) AS total_dinero
    FROM base b
    JOIN fincas f ON f.id = b.finca_id
    GROUP BY f.id, f.nombre;
  `;

  const rows = await sequelize.query(sql, {
    type: QueryTypes.SELECT,
    replacements: {
      tipoCosecha: tipoCosechaId,
      estados: ESTADOS_VALIDOS,
      fincaId: p.finca_id,
      cosechaId: p.cosecha_id,
      loteId: p.lote_id,
      desde: p.desde,
      hasta: p.hasta,
    },
  });

  const r = rows[0] || {
    finca_id: p.finca_id,
    finca_nombre: null,
    kg_planificados: 0,
    kg_cosechados: 0,
    kg_rechazo: 0,
    gabetas_entregadas: 0,
    gabetas_devueltas: 0,
    total_dinero: 0,
  };

  const kgPlan = Number(r.kg_planificados || 0);
  const kgCos = Number(r.kg_cosechados || 0);
  const kgMer = Number(r.kg_rechazo || 0);
  const gEnt = Number(r.gabetas_entregadas || 0);
  const gDev = Number(r.gabetas_devueltas || 0);
  const totalDin = Number(r.total_dinero || 0);

  const cumplimiento = kgPlan > 0 ? (kgCos / kgPlan) * 100 : 0;
  const mermaPct = kgCos > 0 ? (kgMer / kgCos) * 100 : 0;
  const gNet = gEnt - gDev;
  const precioKg = kgCos > 0 ? totalDin / kgCos : 0;

  return {
    filtros: {
      finca_id: p.finca_id,
      cosecha_id: p.cosecha_id,
      lote_id: p.lote_id,
      desde: p.desde,
      hasta: p.hasta,
      estados: ESTADOS_VALIDOS,
      tipo_id: tipoCosechaId
    },
    finca: { id: r.finca_id, nombre: r.finca_nombre },
    produccion: {
      kg_planificados: kgPlan,
      kg_cosechados: kgCos,
      cumplimiento_pct: Number(cumplimiento.toFixed(2)),
    },
    merma: {
      kg_rechazados: kgMer,
      merma_pct: Number(mermaPct.toFixed(2)),
    },
    logistica: {
      gabetas_entregadas: gEnt,
      gabetas_devueltas: gDev,
      gabetas_netas: gNet,
    },
    economico: {
      total_dinero: Number(totalDin.toFixed(2)),
      precio_promedio_kg: Number(precioKg.toFixed(4)),
    },
  };
};

// =======================
// 2) POR LOTE (tabla principal)
// =======================
exports.reporteProduccionPorLote = async (currentUser, query) => {
  const tipoCosechaId = await getTipoCosechaId();
  const { desde, hasta } = parseRange(query);
  const p = buildWhere({ ...query, desde, hasta });

  const sql = `
    WITH base AS (
      SELECT
        t.id,
        l.finca_id,
        t.cosecha_id,
        t.lote_id,
        COALESCE(t.fecha_fin_real, t.fecha_programada)::date AS fecha_reporte,
        t.detalles
      FROM tareas t
      JOIN lotes l ON l.id = t.lote_id
      WHERE
        t.tipo_id = :tipoCosecha
        AND t.estado  IN (:estados)
        AND l.finca_id = :fincaId
        AND (:cosechaId::bigint IS NULL OR t.cosecha_id = :cosechaId)
        AND (:loteId::bigint   IS NULL OR t.lote_id   = :loteId)
        AND COALESCE(t.fecha_fin_real, t.fecha_programada)::date BETWEEN :desde::date AND :hasta::date
    ),
    merma_por_tarea AS (
      SELECT
        b.lote_id,
        b.id AS tarea_id,
        SUM(COALESCE((r->>'kg')::numeric,0)) AS kg_rechazo
      FROM base b
      LEFT JOIN LATERAL jsonb_array_elements(COALESCE(b.detalles->'rechazos','[]'::jsonb)) r ON true
      GROUP BY b.lote_id, b.id
    )
    SELECT
      l.id AS lote_id,
      l.nombre AS lote,
      l.superficie_ha,
      l.numero_plantas,
      COALESCE(SUM( (b.detalles->>'kg_planificados')::numeric ),0) AS kg_planificados,
      COALESCE(SUM( (b.detalles->>'kg_cosechados')::numeric ),0) AS kg_cosechados,
      COALESCE(SUM( m.kg_rechazo ),0) AS kg_rechazo,
      COALESCE(SUM( (b.detalles->'entrega'->>'gabetas_entregadas')::numeric ),0)
        - COALESCE(SUM( (b.detalles->'entrega'->>'gabetas_devueltas')::numeric ),0) AS gabetas_netas,
      COALESCE(SUM( (b.detalles->>'total_dinero')::numeric ),0) AS total_dinero
    FROM base b
    JOIN lotes l ON l.id = b.lote_id
    LEFT JOIN merma_por_tarea m ON m.tarea_id = b.id
    GROUP BY l.id, l.nombre, l.superficie_ha, l.numero_plantas
    ORDER BY kg_cosechados DESC;
  `;

  const rows = await sequelize.query(sql, {
    type: QueryTypes.SELECT,
    replacements: {
      tipoCosecha: tipoCosechaId,
      estados: ESTADOS_VALIDOS,
      fincaId: p.finca_id,
      cosechaId: p.cosecha_id,
      loteId: p.lote_id,
      desde: p.desde,
      hasta: p.hasta,
    },
  });

  const lotes = rows.map((r) => {
    const kgPlan = Number(r.kg_planificados || 0);
    const kgCos = Number(r.kg_cosechados || 0);
    const kgMer = Number(r.kg_rechazo || 0);
    const cum = kgPlan > 0 ? (kgCos / kgPlan) * 100 : 0;
    const merPct = kgCos > 0 ? (kgMer / kgCos) * 100 : 0;
    const totalDin = Number(r.total_dinero || 0);
    const precioKg = kgCos > 0 ? totalDin / kgCos : 0;

    return {
      lote_id: Number(r.lote_id),
      lote: r.lote,
      superficie_ha: Number(r.superficie_ha || 0),
      numero_plantas: Number(r.numero_plantas || 0),
      kg_planificados: kgPlan,
      kg_cosechados: kgCos,
      cumplimiento_pct: Number(cum.toFixed(2)),
      kg_merma: kgMer,
      merma_pct: Number(merPct.toFixed(2)),
      gabetas_netas: Number(r.gabetas_netas || 0),
      total_dinero: Number(totalDin.toFixed(2)),
      precio_promedio_kg: Number(precioKg.toFixed(4)),
    };
  });

  return {
    filtros: {
      finca_id: p.finca_id,
      cosecha_id: p.cosecha_id,
      lote_id: p.lote_id,
      desde: p.desde,
      hasta: p.hasta,
      estados: ESTADOS_VALIDOS,
      tipo_id: tipoCosechaId,
    },
    lotes,
  };
};

// =======================
// 3) CLASIFICACIÓN (destino)
// =======================
exports.reporteProduccionClasificacion = async (currentUser, query) => {
  const tipoCosechaId = await getTipoCosechaId();
  const { desde, hasta } = parseRange(query);
  const p = buildWhere({ ...query, desde, hasta });

  const sql = `
    WITH base AS (
      SELECT
        t.id,
        l.finca_id,
        t.cosecha_id,
        t.lote_id,
        COALESCE(t.fecha_fin_real, t.fecha_programada)::date AS fecha_reporte,
        t.detalles
      FROM tareas t
      JOIN lotes l ON l.id = t.lote_id
      WHERE
        t.tipo_id = :tipoCosecha
        AND t.estado  IN (:estados)
        AND l.finca_id = :fincaId
        AND (:cosechaId::bigint IS NULL OR t.cosecha_id = :cosechaId)
        AND (:loteId::bigint   IS NULL OR t.lote_id   = :loteId)
        AND COALESCE(t.fecha_fin_real, t.fecha_programada)::date BETWEEN :desde::date AND :hasta::date
    ),
    det AS (
      SELECT
        (c->>'destino')::text AS destino,
        COALESCE((c->>'kg')::numeric,0) AS kg,
        COALESCE((c->>'gabetas')::numeric,0) AS gabetas,
        COALESCE((c->>'peso_promedio_gabeta_kg')::numeric,0) AS peso_promedio_gabeta_kg
      FROM base b
      JOIN LATERAL jsonb_array_elements(COALESCE(b.detalles->'clasificacion','[]'::jsonb)) c ON true
    )
    SELECT
      destino,
      SUM(kg) AS kg,
      SUM(gabetas) AS gabetas,
      CASE WHEN SUM(gabetas) > 0 THEN SUM(kg) / SUM(gabetas) ELSE 0 END AS kg_por_gabeta
    FROM det
    GROUP BY destino
    ORDER BY kg DESC;
  `;

  const rows = await sequelize.query(sql, {
    type: QueryTypes.SELECT,
    replacements: {
      tipoCosecha: tipoCosechaId,
      estados: ESTADOS_VALIDOS,
      fincaId: p.finca_id,
      cosechaId: p.cosecha_id,
      loteId: p.lote_id,
      desde: p.desde,
      hasta: p.hasta,
    },
  });

  const totalKg = rows.reduce((acc, r) => acc + Number(r.kg || 0), 0);

  return {
    filtros: {
      finca_id: p.finca_id,
      cosecha_id: p.cosecha_id,
      lote_id: p.lote_id,
      desde: p.desde,
      hasta: p.hasta,
      estados: ESTADOS_VALIDOS,
      tipo_id: tipoCosechaId,
    },
    clasificacion: rows.map((r) => ({
      destino: r.destino || "Sin destino",
      kg: Number(Number(r.kg || 0).toFixed(2)),
      porcentaje: totalKg > 0 ? Number(((Number(r.kg || 0) / totalKg) * 100).toFixed(2)) : 0,
      gabetas: Number(r.gabetas || 0),
      kg_por_gabeta: Number(Number(r.kg_por_gabeta || 0).toFixed(4)),
    })),
    total_kg_clasificado: Number(totalKg.toFixed(2)),
  };
};

// =======================
// 4) MERMA (causas)
// =======================
exports.reporteProduccionMerma = async (currentUser, query) => {
  const tipoCosechaId = await getTipoCosechaId();
  const { desde, hasta } = parseRange(query);
  const p = buildWhere({ ...query, desde, hasta });

  const sql = `
    WITH base AS (
      SELECT
        t.id,
        l.finca_id,
        t.cosecha_id,
        t.lote_id,
        COALESCE(t.fecha_fin_real, t.fecha_programada)::date AS fecha_reporte,
        t.detalles
      FROM tareas t
      JOIN lotes l ON l.id = t.lote_id
      WHERE
        t.tipo_id = :tipoCosecha
        AND t.estado IN (:estados)
        AND l.finca_id = :fincaId
        AND (:cosechaId::bigint IS NULL OR t.cosecha_id = :cosechaId)
        AND (:loteId::bigint   IS NULL OR t.lote_id   = :loteId)
        AND COALESCE(t.fecha_fin_real, t.fecha_programada)::date BETWEEN :desde::date AND :hasta::date
    ),
    det AS (
      SELECT
        COALESCE((r->>'causa')::text,'Otro') AS causa,
        COALESCE((r->>'kg')::numeric,0) AS kg
      FROM base b
      JOIN LATERAL jsonb_array_elements(COALESCE(b.detalles->'rechazos','[]'::jsonb)) r ON true
    )
    SELECT causa, SUM(kg) AS kg
    FROM det
    GROUP BY causa
    ORDER BY kg DESC;
  `;

  const rows = await sequelize.query(sql, {
    type: QueryTypes.SELECT,
    replacements: {
      tipoCosecha: tipoCosechaId,
      estados: ESTADOS_VALIDOS,
      fincaId: p.finca_id,
      cosechaId: p.cosecha_id,
      loteId: p.lote_id,
      desde: p.desde,
      hasta: p.hasta,
    },
  });

  const totalKgMerma = rows.reduce((acc, r) => acc + Number(r.kg || 0), 0);

  return {
    filtros: {
      finca_id: p.finca_id,
      cosecha_id: p.cosecha_id,
      lote_id: p.lote_id,
      desde: p.desde,
      hasta: p.hasta,
      estados: ESTADOS_VALIDOS,
      tipo_id: tipoCosechaId,
    },
    total_kg_merma: Number(totalKgMerma.toFixed(2)),
    causas: rows.map((r) => ({
      causa: r.causa || "Otro",
      kg: Number(Number(r.kg || 0).toFixed(2)),
      porcentaje: totalKgMerma > 0 ? Number(((Number(r.kg || 0) / totalKgMerma) * 100).toFixed(2)) : 0,
    })),
  };
};

// =======================
// 5) LOGÍSTICA (centros acopio)
// =======================
exports.reporteProduccionLogistica = async (currentUser, query) => {
  const tipoCosechaId = await getTipoCosechaId();
  const { desde, hasta } = parseRange(query);
  const p = buildWhere({ ...query, desde, hasta });

  const sql = `
    WITH base AS (
      SELECT
        t.id,
        l.finca_id,
        t.cosecha_id,
        t.lote_id,
        COALESCE(t.fecha_fin_real, t.fecha_programada)::date AS fecha_reporte,
        t.detalles
      FROM tareas t
      JOIN lotes l ON l.id = t.lote_id
      WHERE
        t.tipo_id = :tipoCosecha
        AND t.estado  IN (:estados)
        AND l.finca_id = :fincaId
        AND (:cosechaId::bigint IS NULL OR t.cosecha_id = :cosechaId)
        AND (:loteId::bigint   IS NULL OR t.lote_id   = :loteId)
        AND COALESCE(t.fecha_fin_real, t.fecha_programada)::date BETWEEN :desde::date AND :hasta::date
    )
    SELECT
      COALESCE(NULLIF((b.detalles->'entrega'->>'centro_acopio')::text,''),'Sin centro') AS centro,
      SUM(COALESCE((b.detalles->'entrega'->>'gabetas_entregadas')::numeric,0)) AS entregadas,
      SUM(COALESCE((b.detalles->'entrega'->>'gabetas_devueltas')::numeric,0)) AS devueltas
    FROM base b
    GROUP BY centro
    ORDER BY entregadas DESC;
  `;

  const rows = await sequelize.query(sql, {
    type: QueryTypes.SELECT,
    replacements: {
      tipoCosecha: tipoCosechaId,
      estados: ESTADOS_VALIDOS,
      fincaId: p.finca_id,
      cosechaId: p.cosecha_id,
      loteId: p.lote_id,
      desde: p.desde,
      hasta: p.hasta,
    },
  });

  return {
    filtros: {
      finca_id: p.finca_id,
      cosecha_id: p.cosecha_id,
      lote_id: p.lote_id,
      desde: p.desde,
      hasta: p.hasta,
      estados: ESTADOS_VALIDOS,
      tipo_id: tipoCosechaId,
    },
    centros: rows.map((r) => {
      const ent = Number(r.entregadas || 0);
      const dev = Number(r.devueltas || 0);
      const net = ent - dev;
      const pct = ent > 0 ? (dev / ent) * 100 : 0;
      return {
        centro: r.centro,
        gabetas_entregadas: ent,
        gabetas_devueltas: dev,
        gabetas_netas: net,
        devolucion_pct: Number(pct.toFixed(2)),
      };
    }),
  };
};

// =======================
// 6) EVENTOS (listado tareas cosecha)
// =======================
exports.reporteProduccionEventos = async (currentUser, query) => {
  const tipoCosechaId = await getTipoCosechaId();
  const { desde, hasta } = parseRange(query);
  const p = buildWhere({ ...query, desde, hasta });

  const sql = `
    WITH base AS (
      SELECT
        t.id AS tarea_id,
        t.estado,
        t.cosecha_id,
        t.lote_id,
        COALESCE(t.fecha_fin_real, t.fecha_programada)::date AS fecha,
        t.detalles
      FROM tareas t
      JOIN lotes l ON l.id = t.lote_id
      WHERE
        t.tipo_id = :tipoCosecha
        AND t.estado IN (:estados)
        AND l.finca_id = :fincaId
        AND (:cosechaId::bigint IS NULL OR t.cosecha_id = :cosechaId)
        AND (:loteId::bigint   IS NULL OR t.lote_id   = :loteId)
        AND COALESCE(t.fecha_fin_real, t.fecha_programada)::date BETWEEN :desde::date AND :hasta::date
    ),
    merma_por_tarea AS (
      SELECT
        b.tarea_id,
        SUM(COALESCE((r->>'kg')::numeric,0)) AS kg_merma
      FROM base b
      LEFT JOIN LATERAL jsonb_array_elements(COALESCE(b.detalles->'rechazos','[]'::jsonb)) r ON true
      GROUP BY b.tarea_id
    )
    SELECT
      b.tarea_id,
      b.fecha,
      b.estado,
      l.nombre AS lote,
      c.nombre AS cosecha,
      COALESCE((b.detalles->>'kg_cosechados')::numeric,0) AS kg_cosechados,
      COALESCE(m.kg_merma,0) AS kg_merma,
      COALESCE(NULLIF((b.detalles->'entrega'->>'centro_acopio')::text,''),'') AS centro_acopio,
      COALESCE((b.detalles->>'total_dinero')::numeric,0) AS total_dinero
    FROM base b
    JOIN lotes l ON l.id = b.lote_id
    JOIN cosechas c ON c.id = b.cosecha_id
    LEFT JOIN merma_por_tarea m ON m.tarea_id = b.tarea_id
    ORDER BY b.fecha DESC, b.tarea_id DESC;
  `;

  const rows = await sequelize.query(sql, {
    type: QueryTypes.SELECT,
    replacements: {
      tipoCosecha: tipoCosechaId,
      estados: ESTADOS_VALIDOS,
      fincaId: p.finca_id,
      cosechaId: p.cosecha_id,
      loteId: p.lote_id,
      desde: p.desde,
      hasta: p.hasta,
    },
  });

  return {
    filtros: {
      finca_id: p.finca_id,
      cosecha_id: p.cosecha_id,
      lote_id: p.lote_id,
      desde: p.desde,
      hasta: p.hasta,
      estados: ESTADOS_VALIDOS,
      tipo_id: tipoCosechaId,
    },
    eventos: rows.map((r) => {
      const kg = Number(r.kg_cosechados || 0);
      const mer = Number(r.kg_merma || 0);
      const pct = kg > 0 ? (mer / kg) * 100 : 0;

      return {
        tarea_id: Number(r.tarea_id),
        fecha: toYmd(r.fecha),
        estado: r.estado,
        cosecha: r.cosecha,
        lote: r.lote,
        kg_cosechados: Number(kg.toFixed(2)),
        kg_merma: Number(mer.toFixed(2)),
        merma_pct: Number(pct.toFixed(2)),
        centro_acopio: r.centro_acopio || "",
        total_dinero: Number(Number(r.total_dinero || 0).toFixed(2)),
      };
    }),
  };
};




// =======================
// 7) COMPARAR FINCAS (KPIs por finca)
// GET /reportes/produccion/comparar/fincas?desde&hasta&cosecha_id?
// =======================
exports.compararFincas = async (currentUser, query) => {
  const tipoCosechaId = await getTipoCosechaId();
  const { desde, hasta } = parseRange(query);

  const cosechaId = query.cosecha_id ? Number(query.cosecha_id) : null;

  const sql = `
    WITH base AS (
      SELECT
        t.id,
        l.finca_id,
        t.cosecha_id,
        t.lote_id,
        COALESCE(t.fecha_fin_real, t.fecha_programada)::date AS fecha_reporte,
        t.detalles
      FROM tareas t
      JOIN lotes l ON l.id = t.lote_id
      WHERE
        t.tipo_id = :tipoCosecha
        AND t.estado IN (:estados)
        AND (:cosechaId::bigint IS NULL OR t.cosecha_id = :cosechaId)
        AND COALESCE(t.fecha_fin_real, t.fecha_programada)::date BETWEEN :desde::date AND :hasta::date
    ),
    merma_por_tarea AS (
      SELECT
        b.finca_id,
        b.id AS tarea_id,
        SUM(COALESCE((r->>'kg')::numeric,0)) AS kg_merma
      FROM base b
      LEFT JOIN LATERAL jsonb_array_elements(COALESCE(b.detalles->'rechazos','[]'::jsonb)) r ON true
      GROUP BY b.finca_id, b.id
    )
    SELECT
      f.id AS finca_id,
      f.nombre AS finca_nombre,
      COALESCE(SUM( (b.detalles->>'kg_planificados')::numeric ),0) AS kg_planificados,
      COALESCE(SUM( (b.detalles->>'kg_cosechados')::numeric ),0) AS kg_cosechados,
      COALESCE(SUM( m.kg_merma ),0) AS kg_merma,
      COALESCE(SUM( (b.detalles->'entrega'->>'gabetas_entregadas')::numeric ),0) AS gabetas_entregadas,
      COALESCE(SUM( (b.detalles->'entrega'->>'gabetas_devueltas')::numeric ),0) AS gabetas_devueltas,
      COALESCE(SUM( (b.detalles->>'total_dinero')::numeric ),0) AS total_dinero
    FROM base b
    JOIN fincas f ON f.id = b.finca_id
    LEFT JOIN merma_por_tarea m ON m.tarea_id = b.id
    GROUP BY f.id, f.nombre
    ORDER BY kg_cosechados DESC, f.nombre ASC;
  `;

  const rows = await sequelize.query(sql, {
    type: QueryTypes.SELECT,
    replacements: {
      tipoCosecha: tipoCosechaId,
      estados: ESTADOS_VALIDOS,
      cosechaId,
      desde,
      hasta,
    },
  });

  const items = rows.map((r) => {
    const kgPlan = Number(r.kg_planificados || 0);
    const kgCos = Number(r.kg_cosechados || 0);
    const kgMer = Number(r.kg_merma || 0);
    const ent = Number(r.gabetas_entregadas || 0);
    const dev = Number(r.gabetas_devueltas || 0);
    const total = Number(r.total_dinero || 0);

    const cumplimiento = kgPlan > 0 ? (kgCos / kgPlan) * 100 : 0;
    const mermaPct = kgCos > 0 ? (kgMer / kgCos) * 100 : 0;
    const precioKg = kgCos > 0 ? total / kgCos : 0;

    return {
      finca_id: Number(r.finca_id),
      finca: r.finca_nombre,
      kg_planificados: kgPlan,
      kg_cosechados: kgCos,
      cumplimiento_pct: Number(cumplimiento.toFixed(2)),
      kg_merma: kgMer,
      merma_pct: Number(mermaPct.toFixed(2)),
      gabetas_entregadas: ent,
      gabetas_devueltas: dev,
      gabetas_netas: ent - dev,
      total_dinero: Number(total.toFixed(2)),
      precio_promedio_kg: Number(precioKg.toFixed(4)),
    };
  });

  return {
    filtros: {
      desde,
      hasta,
      cosecha_id: cosechaId,
      estados: ESTADOS_VALIDOS,
      tipo_id: tipoCosechaId,
    },
    items,
  };
};



// =======================
// 8) COMPARAR COSECHAS (KPIs por cosecha dentro de una finca)
// GET /reportes/produccion/comparar/cosechas?finca_id&desde&hasta
// =======================
exports.compararCosechas = async (currentUser, query) => {
  const tipoCosechaId = await getTipoCosechaId();
  const { desde, hasta } = parseRange(query);

  const fincaId = query.finca_id ? Number(query.finca_id) : null;
  if (!fincaId) {
    const err = new Error("finca_id es obligatorio");
    err.status = 400;
    throw err;
  }

  const sql = `
    WITH base AS (
      SELECT
        t.id,
        l.finca_id,
        t.cosecha_id,
        t.lote_id,
        COALESCE(t.fecha_fin_real, t.fecha_programada)::date AS fecha_reporte,
        t.detalles
      FROM tareas t
      JOIN lotes l ON l.id = t.lote_id
      WHERE
        t.tipo_id = :tipoCosecha
        AND t.estado IN (:estados)
        AND l.finca_id = :fincaId
        AND COALESCE(t.fecha_fin_real, t.fecha_programada)::date BETWEEN :desde::date AND :hasta::date
    ),
    merma_por_tarea AS (
      SELECT
        b.cosecha_id,
        b.id AS tarea_id,
        SUM(COALESCE((r->>'kg')::numeric,0)) AS kg_merma
      FROM base b
      LEFT JOIN LATERAL jsonb_array_elements(COALESCE(b.detalles->'rechazos','[]'::jsonb)) r ON true
      GROUP BY b.cosecha_id, b.id
    )
    SELECT
      c.id AS cosecha_id,
      c.codigo AS cosecha_codigo,
      c.nombre AS cosecha_nombre,
      COALESCE(SUM( (b.detalles->>'kg_planificados')::numeric ),0) AS kg_planificados,
      COALESCE(SUM( (b.detalles->>'kg_cosechados')::numeric ),0) AS kg_cosechados,
      COALESCE(SUM( m.kg_merma ),0) AS kg_merma,
      COALESCE(SUM( (b.detalles->'entrega'->>'gabetas_entregadas')::numeric ),0) AS gabetas_entregadas,
      COALESCE(SUM( (b.detalles->'entrega'->>'gabetas_devueltas')::numeric ),0) AS gabetas_devueltas,
      COALESCE(SUM( (b.detalles->>'total_dinero')::numeric ),0) AS total_dinero
    FROM base b
    JOIN cosechas c ON c.id = b.cosecha_id
    LEFT JOIN merma_por_tarea m ON m.tarea_id = b.id
    GROUP BY c.id, c.codigo, c.nombre
    ORDER BY kg_cosechados DESC, c.id DESC;
  `;

  const rows = await sequelize.query(sql, {
    type: QueryTypes.SELECT,
    replacements: {
      tipoCosecha: tipoCosechaId,
      estados: ESTADOS_VALIDOS,
      fincaId,
      desde,
      hasta,
    },
  });

  const items = rows.map((r) => {
    const kgPlan = Number(r.kg_planificados || 0);
    const kgCos = Number(r.kg_cosechados || 0);
    const kgMer = Number(r.kg_merma || 0);
    const ent = Number(r.gabetas_entregadas || 0);
    const dev = Number(r.gabetas_devueltas || 0);
    const total = Number(r.total_dinero || 0);

    const cumplimiento = kgPlan > 0 ? (kgCos / kgPlan) * 100 : 0;
    const mermaPct = kgCos > 0 ? (kgMer / kgCos) * 100 : 0;
    const precioKg = kgCos > 0 ? total / kgCos : 0;

    return {
      cosecha_id: Number(r.cosecha_id),
      cosecha: r.cosecha_nombre || r.cosecha_codigo || `Cosecha #${r.cosecha_id}`,
      kg_planificados: kgPlan,
      kg_cosechados: kgCos,
      cumplimiento_pct: Number(cumplimiento.toFixed(2)),
      kg_merma: kgMer,
      merma_pct: Number(mermaPct.toFixed(2)),
      gabetas_entregadas: ent,
      gabetas_devueltas: dev,
      gabetas_netas: ent - dev,
      total_dinero: Number(total.toFixed(2)),
      precio_promedio_kg: Number(precioKg.toFixed(4)),
    };
  });

  return {
    filtros: {
      finca_id: fincaId,
      desde,
      hasta,
      estados: ESTADOS_VALIDOS,
      tipo_id: tipoCosechaId,
    },
    items,
  };
};



// =======================
// COMPARAR LOTES (KPIs por lote)
// =======================
function parseCsv(v) {
  if (!v) return [];
  return String(v)
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function normalizeFechas(q) {
  // mismo criterio que parseRange: hasta hoy, desde -30 días si no mandan
  const hoy = new Date();
  const hasta = q?.hasta ? new Date(q.hasta) : hoy;
  const desde = q?.desde
    ? new Date(q.desde)
    : new Date(hasta.getTime() - 30 * 24 * 60 * 60 * 1000);

  const toYmdLocal = (v) => {
    const d = new Date(v);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  return { desde: toYmdLocal(desde), hasta: toYmdLocal(hasta) };
}

exports.compararLotes = async (_currentUser, q) => {
  const finca_id = Number(q.finca_id);
  if (!finca_id) throw badRequest("finca_id es obligatorio");

  const { desde, hasta } = normalizeFechas(q);

  // estados default
  const estados = parseCsv(q.estados);
  const finalEstados = estados.length ? estados : ["Completada", "Verificada"];

  // cosecha opcional
  const cosecha_id = q.cosecha_id ? Number(q.cosecha_id) : null;

  // lote_ids opcional
  const loteIds = parseIds(q.lote_ids);
  const hasLotes = loteIds.length > 0;

  // tipo_id opcional (si no, COSECHA)
  const tipo_id = q.tipo_id ? Number(q.tipo_id) : await getTipoCosechaId();

  // ✅ SQL dinámico: solo filtra por lotes si hasLotes
  const loteFilterSql = hasLotes ? `AND t.lote_id IN (:loteIds)` : ``;

  const sql = `
    WITH base AS (
      SELECT
        t.id,
        t.lote_id,
        COALESCE(t.fecha_fin_real, t.fecha_programada)::date AS fecha_reporte,
        t.detalles
      FROM tareas t
      JOIN lotes l ON l.id = t.lote_id
      WHERE
        t.tipo_id = :tipoId
        AND t.estado IN (:estados)
        AND l.finca_id = :fincaId
        AND (:cosechaId::bigint IS NULL OR t.cosecha_id = :cosechaId)
        ${loteFilterSql}
        AND COALESCE(t.fecha_fin_real, t.fecha_programada)::date
            BETWEEN :desde::date AND :hasta::date
    ),
    merma_por_tarea AS (
      SELECT
        b.lote_id,
        b.id AS tarea_id,
        SUM(COALESCE((r->>'kg')::numeric,0)) AS kg_merma
      FROM base b
      LEFT JOIN LATERAL jsonb_array_elements(COALESCE(b.detalles->'rechazos','[]'::jsonb)) r ON true
      GROUP BY b.lote_id, b.id
    )
    SELECT
      l.id AS lote_id,
      l.nombre AS lote,
      COALESCE(SUM((b.detalles->>'kg_planificados')::numeric),0) AS kg_planificados,
      COALESCE(SUM((b.detalles->>'kg_cosechados')::numeric),0) AS kg_cosechados,
      COALESCE(SUM(m.kg_merma),0) AS kg_merma,
      COALESCE(SUM((b.detalles->'entrega'->>'gabetas_entregadas')::numeric),0) AS gabetas_entregadas,
      COALESCE(SUM((b.detalles->'entrega'->>'gabetas_devueltas')::numeric),0) AS gabetas_devueltas,
      COALESCE(SUM((b.detalles->>'total_dinero')::numeric),0) AS total_dinero
    FROM base b
    JOIN lotes l ON l.id = b.lote_id
    LEFT JOIN merma_por_tarea m ON m.tarea_id = b.id
    GROUP BY l.id, l.nombre
    ORDER BY kg_cosechados DESC, l.nombre ASC;
  `;

  const replacements = {
    tipoId: tipo_id,
    estados: finalEstados,
    fincaId: finca_id,
    cosechaId: cosecha_id,
    desde,
    hasta,
  };

  // ✅ SOLO si hay loteIds, se envía loteIds
  if (hasLotes) replacements.loteIds = loteIds;

  const rows = await sequelize.query(sql, {
    type: QueryTypes.SELECT,
    replacements,
  });

  const items = rows.map((r) => {
    const kgPlan = Number(r.kg_planificados || 0);
    const kgCos = Number(r.kg_cosechados || 0);
    const kgMer = Number(r.kg_merma || 0);

    const gEnt = Number(r.gabetas_entregadas || 0);
    const gDev = Number(r.gabetas_devueltas || 0);
    const gNet = gEnt - gDev;

    const totalDin = Number(r.total_dinero || 0);

    const cumplimiento = kgPlan > 0 ? (kgCos / kgPlan) * 100 : 0;
    const mermaPct = kgCos > 0 ? (kgMer / kgCos) * 100 : 0;
    const precioKg = kgCos > 0 ? totalDin / kgCos : 0;

    return {
      lote_id: Number(r.lote_id),
      lote: r.lote,
      kg_planificados: kgPlan,
      kg_cosechados: kgCos,
      cumplimiento_pct: Number(cumplimiento.toFixed(2)),
      kg_merma: kgMer,
      merma_pct: Number(mermaPct.toFixed(2)),
      gabetas_entregadas: gEnt,
      gabetas_devueltas: gDev,
      gabetas_netas: gNet,
      total_dinero: Number(totalDin.toFixed(2)),
      precio_promedio_kg: Number(precioKg.toFixed(4)),
    };
  });

  return {
    filtros: {
      finca_id,
      cosecha_id,
      lote_ids: hasLotes ? loteIds : null,
      desde,
      hasta,
      estados: finalEstados,
      tipo_id,
    },
    items,
  };
};



// =====================================================
// DASHBOARD (Tareas + Inventario) - Minimalista
// GET /reportes/dashboard?finca_ids=1,2&desde=YYYY-MM-DD&hasta=YYYY-MM-DD&solo_cosecha_activa=true
// =====================================================
exports.reporteDashboard = async (_currentUser, query) => {
  const {
    finca_ids,
    finca_id, // compat
    desde,
    hasta,
    solo_cosecha_activa,
    limit_hoy = 8,
    limit_criticos = 8,
  } = query;

  // -----------------------------
  // Helpers internos del dashboard
  // -----------------------------
  const endStates = ["Verificada", "Cancelada"]; // cerradas para dashboard

  const ymdToday = (() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  })();

  const desdeNorm = normStr(desde) || null;
  const hastaNorm = normStr(hasta) || null;

  // ✅ Fincas: si mandan finca_ids usa eso; si mandan finca_id úsalo; si no, todas activas.
  const fincaIds = (() => {
    const a = parseIds(finca_ids);
    const b = parseIds(finca_id);
    const out = a.length ? a : b;
    return out;
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

  if (!fincas.length) throw badRequest("No hay fincas disponibles para el dashboard.");

  // ✅ Resolver cosecha activa por finca (si aplica)
  const useActiva =
    solo_cosecha_activa === undefined || solo_cosecha_activa === null
      ? true
      : String(solo_cosecha_activa) === "true";

  const fincaToCosechaActiva = new Map();
  if (useActiva) {
    for (const f of fincas) {
      const cId = await resolverCosechaId({
        finca_id: f.id,
        cosecha_id: null,
        solo_cosecha_activa: true,
      });
      // puede ser null si no hay activa
      fincaToCosechaActiva.set(Number(f.id), cId ? Number(cId) : null);
    }
  }

  // -----------------------------
  // WHERE base para tareas (por fincas)
  // -----------------------------
  const whereFecha = {};
  if (desdeNorm && hastaNorm) {
    whereFecha[Op.and] = [
      ...(whereFecha[Op.and] || []),
      literal(`"Tarea"."fecha_programada" >= '${desdeNorm} 00:00:00'::timestamp`),
      literal(`"Tarea"."fecha_programada" <  '${hastaNorm} 00:00:00'::timestamp + interval '1 day'`),
    ];
  } else if (desdeNorm) {
    whereFecha[Op.and] = [
      ...(whereFecha[Op.and] || []),
      literal(`"Tarea"."fecha_programada" >= '${desdeNorm} 00:00:00'::timestamp`),
    ];
  } else if (hastaNorm) {
    whereFecha[Op.and] = [
      ...(whereFecha[Op.and] || []),
      literal(`"Tarea"."fecha_programada" < '${hastaNorm} 00:00:00'::timestamp + interval '1 day'`),
    ];
  } else {
    // default: últimos 30 días
    const d = new Date();
    const h = new Date(d);
    h.setDate(h.getDate() - 30);
    const toYmd = (x) => {
      const yyyy = x.getFullYear();
      const mm = String(x.getMonth() + 1).padStart(2, "0");
      const dd = String(x.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    };
    const dFrom = toYmd(h);
    const dTo = toYmd(d);
    whereFecha[Op.and] = [
      ...(whereFecha[Op.and] || []),
      literal(`"Tarea"."fecha_programada" >= '${dFrom} 00:00:00'::timestamp`),
      literal(`"Tarea"."fecha_programada" <  '${dTo} 00:00:00'::timestamp + interval '1 day'`),
    ];
  }

  // INCLUDE Lote (para filtrar por fincas)
  const includeLoteStats = {
    model: models.Lote,
    attributes: [],
    required: true,
    where: { finca_id: { [Op.in]: fincas.map((x) => Number(x.id)) } },
  };

  // -----------------------------
  // 1) KPIs globales (tareas)
  // -----------------------------
  const baseWhereGlobal = {
    ...whereFecha,
  };

  // Si solo cosecha activa está ON, filtramos tareas por las cosechas activas existentes.
  // Si una finca no tiene cosecha activa, dejamos esa finca sin ese filtro (igual aparecen por finca en resumen).
  let cosechasActivasIds = [];
  if (useActiva) {
    cosechasActivasIds = Array.from(fincaToCosechaActiva.values()).filter(Boolean);
    if (cosechasActivasIds.length) {
      baseWhereGlobal.cosecha_id = { [Op.in]: cosechasActivasIds };
    }
  }

  // Total por estado (para donut)
  const porEstadoRows = await models.Tarea.findAll({
    where: baseWhereGlobal,
    include: [includeLoteStats],
    attributes: [[col("Tarea.estado"), "estado"], [fn("COUNT", col("Tarea.id")), "total"]],
    group: [col("Tarea.estado")],
    raw: true,
  });

  const ORDER_ESTADOS = ["Pendiente", "Asignada", "En progreso", "Completada", "Verificada", "Cancelada"];
  const tareas_por_estado = {};
  for (const s of ORDER_ESTADOS) tareas_por_estado[s] = 0;
  for (const r of porEstadoRows) tareas_por_estado[String(r.estado)] = Number(r.total || 0);

  const total_tareas = ORDER_ESTADOS.reduce((acc, s) => acc + (tareas_por_estado[s] || 0), 0);

  // Vencidas (fecha < hoy, no finalizadas)
  const vencidasCount = await models.Tarea.count({
    where: {
      ...baseWhereGlobal,
      estado: { [Op.notIn]: endStates },
      [Op.and]: [
        ...(baseWhereGlobal[Op.and] || []),
        literal(`"Tarea"."fecha_programada" < '${ymdToday} 00:00:00'::timestamp`),
      ],
    },
    include: [includeLoteStats],
    distinct: true,
  });

  const pendientesCount = (tareas_por_estado["Pendiente"] || 0) + (tareas_por_estado["Asignada"] || 0);

  const enProgresoCount = tareas_por_estado["En progreso"] || 0;
  const verificadasCount = tareas_por_estado["Verificada"] || 0;

  // -----------------------------
  // 2) Tareas de hoy (tabla)
  // -----------------------------
  const hoyRows = await models.Tarea.findAll({
    where: {
      ...baseWhereGlobal,
      [Op.and]: [
        ...(baseWhereGlobal[Op.and] || []),
        literal(`"Tarea"."fecha_programada" >= '${ymdToday} 00:00:00'::timestamp`),
        literal(`"Tarea"."fecha_programada" <  '${ymdToday} 00:00:00'::timestamp + interval '1 day'`),
      ],
    },
    include: [
      { model: models.TipoActividad, attributes: ["codigo", "nombre"] },
      {
        model: models.Lote,
        attributes: ["id", "nombre", "finca_id"],
        required: true,
        include: [{ model: models.Finca, as: "finca", attributes: ["id", "nombre"] }],
      },
      {
        model: models.TareaAsignacion,
        required: false,
        include: [{ model: models.Usuario, attributes: ["id", "nombres", "apellidos", "tipo"] }],
      },
    ],
    order: [["fecha_programada", "ASC"]],
    limit: normPosInt(limit_hoy, 8),
  });

  const tareas_hoy = hoyRows.map((t) => {
    const j = t.toJSON();
    const asignados = (j.TareaAsignacions || []).map((a) => ({
      id: a.Usuario?.id,
      nombre: a.Usuario ? `${a.Usuario.nombres} ${a.Usuario.apellidos}` : null,
      tipo: a.Usuario?.tipo || null,
      rol_en_tarea: a.rol_en_tarea,
    }));

    return {
      id: Number(j.id),
      finca: j.Lote?.finca?.nombre || null,
      lote: j.Lote?.nombre || null,
      tipo: j.TipoActividad?.codigo || null,
      titulo: j.titulo || null,
      estado: j.estado,
      fecha_programada: j.fecha_programada,
      asignados,
    };
  });

  // -----------------------------
  // 3) Pendientes críticos (vencidas o por vencer)
  // -----------------------------
  // regla: estado != Verificada/Cancelada
  // orden: vencidas primero, luego por fecha asc
  const criticosRows = await models.Tarea.findAll({
    where: {
      ...baseWhereGlobal,
      estado: { [Op.notIn]: endStates },
    },
    include: [
      { model: models.TipoActividad, attributes: ["codigo", "nombre"] },
      {
        model: models.Lote,
        attributes: ["id", "nombre", "finca_id"],
        required: true,
        include: [{ model: models.Finca, as: "finca", attributes: ["id", "nombre"] }],
      },
    ],
    order: [
      [
        literal(`CASE WHEN "Tarea"."fecha_programada" < '${ymdToday} 00:00:00'::timestamp THEN 0 ELSE 1 END`),
        "ASC",
      ],
      ["fecha_programada", "ASC"],
    ],
    limit: normPosInt(limit_criticos, 8),
  });

  const pendientes_criticos = criticosRows.map((t) => {
    const j = t.toJSON();
    const fecha = j.fecha_programada;
    return {
      id: Number(j.id),
      finca: j.Lote?.finca?.nombre || null,
      lote: j.Lote?.nombre || null,
      tipo: j.TipoActividad?.codigo || null,
      titulo: j.titulo || null,
      estado: j.estado,
      fecha_programada: fecha,
      es_vencida: fecha ? new Date(fecha).getTime() < new Date(`${ymdToday}T00:00:00`).getTime() : false,
    };
  });

  // -----------------------------
  // 4) Resumen por finca
  // -----------------------------
  const resumenPorFincaRows = await models.Tarea.findAll({
    where: baseWhereGlobal,
    include: [
      {
        model: models.Lote,
        attributes: [],
        required: true,
        include: [{ model: models.Finca, as: "finca", attributes: ["id", "nombre"] }],
      },
    ],
    attributes: [
      [col("Lote.finca.id"), "finca_id"],
      [col("Lote.finca.nombre"), "finca_nombre"],
      [col("Tarea.estado"), "estado"],
      [fn("COUNT", col("Tarea.id")), "total"],
    ],
    group: [col("Lote.finca.id"), col("Lote.finca.nombre"), col("Tarea.estado")],
    raw: true,
  });

  const mapFincas = new Map();
  for (const f of fincas) {
    mapFincas.set(Number(f.id), {
      finca_id: Number(f.id),
      finca: f.nombre,
      cosecha_activa_id: fincaToCosechaActiva.get(Number(f.id)) || null,
      pendientes: 0,
      en_progreso: 0,
      completadas: 0,
      verificadas: 0,
      canceladas: 0,
      vencidas: 0,
    });
  }

  for (const r of resumenPorFincaRows) {
    const fid = Number(r.finca_id);
    const st = String(r.estado);
    const tot = Number(r.total || 0);
    const item = mapFincas.get(fid);
    if (!item) continue;

    if (st === "Pendiente" || st === "Asignada") item.pendientes += tot;
    else if (st === "En progreso") item.en_progreso += tot;
    else if (st === "Completada") item.completadas += tot;
    else if (st === "Verificada") item.verificadas += tot;
    else if (st === "Cancelada") item.canceladas += tot;
  }

  // Vencidas por finca (otra consulta)
  const vencidasPorFinca = await models.Tarea.findAll({
    where: {
      ...baseWhereGlobal,
      estado: { [Op.notIn]: endStates },
      [Op.and]: [
        ...(baseWhereGlobal[Op.and] || []),
        literal(`"Tarea"."fecha_programada" < '${ymdToday} 00:00:00'::timestamp`),
      ],
    },
    include: [
      {
        model: models.Lote,
        attributes: [],
        required: true,
        include: [{ model: models.Finca, as: "finca", attributes: ["id"] }],
      },
    ],
    attributes: [[col("Lote.finca.id"), "finca_id"], [fn("COUNT", col("Tarea.id")), "total"]],
    group: [col("Lote.finca.id")],
    raw: true,
  });

  for (const r of vencidasPorFinca) {
    const item = mapFincas.get(Number(r.finca_id));
    if (item) item.vencidas = Number(r.total || 0);
  }

  const resumen_por_finca = Array.from(mapFincas.values()).sort((a, b) =>
    String(a.finca).localeCompare(String(b.finca))
  );

  // -----------------------------
  // 5) Gráfico: vencidas últimos 14 días (por día)
  // -----------------------------
  const ult14 = await sequelize.query(
    `
    SELECT
      (date_trunc('day', t.fecha_programada))::date AS dia,
      COUNT(*)::int AS total
    FROM tareas t
    JOIN lotes l ON l.id = t.lote_id
    WHERE
      l.finca_id = ANY(ARRAY[:fincas]::bigint[])

      AND t.estado NOT IN ('Verificada','Cancelada')
      AND t.fecha_programada < NOW()
      AND t.fecha_programada >= NOW() - interval '14 days'
    GROUP BY dia
    ORDER BY dia ASC
    `,
    {
      type: QueryTypes.SELECT,
      replacements: { fincas: fincas.map((x) => Number(x.id)) },
    }
  );

  const vencidas_ult_14_dias = ult14.map((r) => ({ dia: String(r.dia), vencidas: Number(r.total || 0) }));

// -----------------------------
// 6) Inventario (global): resumen + alertas agregadas
// -----------------------------
const invResumen = await exports.reporteInventarioResumen(_currentUser, query);

// Alertas agregadas tipo gráfico
const sinStock = Number(invResumen?.stats?.items_sin_stock || 0);
const bajoMin = Number(invResumen?.stats?.items_bajo_minimo || 0);
const fefo = Number(invResumen?.stats?.lotes_por_vencer || 0);

const alertas_inventario = {
  sin_stock: sinStock,
  bajo_minimo: bajoMin,
  fefo_proximo: fefo,
  total_alertas: sinStock + bajoMin + fefo,
};

// -----------------------------
// 6.1) Detalle de alertas (para tabla en Dashboard)
// -----------------------------
const fefoDias = Number(query?.fefo_dias || 30);

const ModelItem = models.InventarioItem;
const ModelLote = models.InventarioLote;

// 1) Items sin stock
const itemsSinStock = await ModelItem.findAll({
  attributes: ["id", "nombre", "stock_actual"],
  where: { stock_actual: { [Op.lte]: 0 } },
  order: [["nombre", "ASC"]],
  limit: 50,
  raw: true,
});

// 2) Items bajo mínimo
const itemsBajoMin = await ModelItem.findAll({
  attributes: ["id", "nombre", "stock_actual", "stock_minimo"],
  where: {
    stock_minimo: { [Op.gt]: 0 },
    stock_actual: { [Op.lt]: col("stock_minimo") },
  },
  order: [["nombre", "ASC"]],
  limit: 50,
  raw: true,
});

// 3) FEFO próximo (lotes con vencimiento)
const hoy = new Date();
const limite = new Date();
limite.setDate(limite.getDate() + fefoDias);
const ymd = (d) => d.toISOString().slice(0, 10);

const lotesPorVencer = await ModelLote.findAll({
  attributes: ["id", "item_id", "codigo_lote_proveedor", "fecha_vencimiento", "cantidad_actual"],
  where: {
    cantidad_actual: { [Op.gt]: 0 },
    fecha_vencimiento: { [Op.gte]: ymd(hoy), [Op.lte]: ymd(limite) },
  },
  include: [
    {
      model: ModelItem,
      attributes: ["id", "nombre", "unidad_id"],
      include: [{ model: models.Unidad, attributes: ["id", "codigo", "nombre"] }],
    },
  ],
  order: [["fecha_vencimiento", "ASC"]],
  limit: 50,
});


const fefoDetalle = lotesPorVencer.map((x) => {
  const j = x.toJSON();
  const item = j?.InventarioItem || null;
  const unidad = item?.Unidad || null;

  return {
    lote_id: Number(j.id),
    item_id: Number(j.item_id),
    item: item?.nombre || null,
    codigo_lote: j.codigo_lote_proveedor || null,
    fecha_vencimiento: j.fecha_vencimiento,
    cantidad_actual: Number(j.cantidad_actual || 0),
    unidad: unidad
      ? { id: Number(unidad.id), codigo: unidad.codigo, nombre: unidad.nombre }
      : null,
  };
});


// ✅ Detalle dentro del resumen de inventario
invResumen.alertas_detalle = {
  sin_stock: itemsSinStock.map((i) => ({
    item_id: Number(i.id),
    item: i.nombre,
    stock_actual: Number(i.stock_actual || 0),
  })),
  bajo_minimo: itemsBajoMin.map((i) => ({
    item_id: Number(i.id),
    item: i.nombre,
    stock_actual: Number(i.stock_actual || 0),
    stock_minimo: Number(i.stock_minimo || 0),
  })),
  fefo_proximo: fefoDetalle,
};

  // -----------------------------
  // Response final (minimalista)
  // -----------------------------
  return {
    header: {
      hoy: ymdToday,
      fincas: fincas.map((f) => ({ id: Number(f.id), nombre: f.nombre })),
      solo_cosecha_activa: useActiva,
      rango: {
        desde: desdeNorm || null,
        hasta: hastaNorm || null,
        default_ultimos_30_dias: !desdeNorm && !hastaNorm,
      },
    },
    
    kpis: {
      total_tareas,
      pendientes: Number(pendientesCount || 0),
      en_progreso: Number(enProgresoCount || 0),
      verificadas: Number(verificadasCount || 0),
      vencidas: Number(vencidasCount || 0),
      alertas_inventario: alertas_inventario.total_alertas,
      prestamos_activos: Number(invResumen?.stats?.prestamos_activos || 0),
    },
    charts: {
      tareas_por_estado,
      vencidas_ult_14_dias,
      alertas_inventario,
    },
    tareas: {
      hoy: tareas_hoy,
      pendientes_criticos,
      resumen_por_finca,
    },
    inventario: {
      resumen: invResumen, // (kpis inventario + nota)
    },
  };
};
