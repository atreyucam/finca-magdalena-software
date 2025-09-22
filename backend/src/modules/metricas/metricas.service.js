const { Op, fn, col, literal } = require('sequelize');
const { models, sequelize } = require('../../db');
const invService = require('../inventario/inventario.service'); // para _getFactor

function badRequest(m='Solicitud inválida'){ const e=new Error(m); e.status=400; e.code='BAD_REQUEST'; return e; }

async function findUnidadByCode(codigo){
  if (!codigo) return null;
  return models.Unidad.findOne({ where: { codigo: codigo.toUpperCase() } });
}

// --- Agua usada (por lote/tarea/periodo) ---
exports.aguaUsada = async ({ lote_id, tarea_id, desde, hasta, unidad='L' }) => {
  // Filtro base: SALIDA, ítems marcados como agua
  const where = { tipo: 'SALIDA' };
  if (desde && hasta) where.fecha = { [Op.between]: [desde, `${hasta} 23:59:59`] };
  else if (desde) where.fecha = { [Op.gte]: desde };
  else if (hasta) where.fecha = { [Op.lte]: `${hasta} 23:59:59` };

  // Filtro por referencia JSONB
  if (lote_id) where.referencia = { [Op.contains]: { lote_id } };
  if (tarea_id) where.referencia = { ...(where.referencia || {}), [Op.contains]: { tarea_id } };

  // Incluir solo items con meta.esAgua = true
  const movimientos = await models.InventarioMovimiento.findAll({
    where,
    include: [{
      model: models.InventarioItem,
      required: true,
      attributes: ['id','nombre','unidad_id','meta'],
      where: sequelize.where(
        literal(`("InventarioItem"."meta"::jsonb)`),
        Op.contains,
        { esAgua: true }
      )
    }],
    order: [['fecha','ASC'],['id','ASC']]
  });

  if (!movimientos.length) {
    return {
      filtros: { lote_id, tarea_id, desde, hasta, unidad },
      total: { cantidad: '0.000', unidad },
      por_dia: [],
      por_tarea: []
    };
  }

  // Unidad objetivo
  const unidadObj = await findUnidadByCode(unidad);
  if (!unidadObj) throw badRequest('unidad inválida');

  // Acumuladores
  let total = 0;
  const porDia = new Map();     // 'YYYY-MM-DD' -> cantidadTarget
  const porTarea = new Map();   // tarea_id -> cantidadTarget

  for (const m of movimientos) {
    const baseUnidadId = m.InventarioItem.unidad_id;
    const factor = await invService._getFactor(baseUnidadId, unidadObj.id); // base -> target
    const qtyTarget = Number(m.cantidad_en_base) * factor;

    total += qtyTarget;

    const fecha = new Date(m.fecha).toISOString().slice(0,10);
    porDia.set(fecha, (porDia.get(fecha) || 0) + qtyTarget);

    const tid = m.referencia?.tarea_id || null;
    if (tid) porTarea.set(tid, (porTarea.get(tid) || 0) + qtyTarget);
  }

  const fmt = (n) => n.toFixed(3);

  return {
    filtros: { lote_id, tarea_id, desde, hasta, unidad },
    total: { cantidad: fmt(total), unidad },
    por_dia: [...porDia.entries()].map(([fecha, cant]) => ({ fecha, cantidad: fmt(cant), unidad })),
    por_tarea: [...porTarea.entries()].map(([tarea_id, cant]) => ({ tarea_id, cantidad: fmt(cant), unidad }))
  };
};

// --- Consumo de insumos (agregado por ítem) ---
exports.consumoInsumos = async ({ lote_id, desde, hasta }) => {
  const where = { tipo: 'SALIDA' };
  if (desde && hasta) where.fecha = { [Op.between]: [desde, `${hasta} 23:59:59`] };
  else if (desde) where.fecha = { [Op.gte]: desde };
  else if (hasta) where.fecha = { [Op.lte]: `${hasta} 23:59:59` };
  if (lote_id) where.referencia = { [Op.contains]: { lote_id } };

  const rows = await models.InventarioMovimiento.findAll({
    where,
    include: [{
      model: models.InventarioItem,
      required: true,
      attributes: ['id','nombre','unidad_id','categoria','meta']
    }, {
      model: models.Unidad,
      attributes: ['id','codigo']
    }],
    order: [['item_id','ASC'],['fecha','ASC']]
  });

  // Agrupar por item (usamos cantidad_en_base y reportamos la unidad base del ítem)
  const map = new Map(); // item_id -> { nombre, unidad_codigo, totalBase }
  for (const r of rows) {
    const item = r.InventarioItem;
    // Si quieres excluir el agua aquí, descomenta:
    // if (item.meta?.esAgua) continue;

    const u = await models.Unidad.findByPk(item.unidad_id, { attributes: ['codigo'] });
    const k = item.id;
    const prev = map.get(k) || { item_id: item.id, item: item.nombre, unidad: u?.codigo || null, cantidad_total: 0 };
    prev.cantidad_total += Number(r.cantidad_en_base);
    map.set(k, prev);
  }

  const data = [...map.values()].map(x => ({
    item_id: x.item_id,
    item: x.item,
    unidad: x.unidad,
    cantidad_total: x.cantidad_total.toFixed(3)
  }));

  // Ordenar descendente por consumo
  data.sort((a,b) => Number(b.cantidad_total) - Number(a.cantidad_total));

  return {
    filtros: { lote_id, desde, hasta },
    total_items: data.length,
    data
  };
};

// --- Estadísticas de tareas por estado ---
exports.tareasStats = async ({ lote_id, desde, hasta }) => {
  const where = {};
  if (lote_id) where.lote_id = lote_id;
  // Usamos fecha_programada como criterio temporal simple
  if (desde && hasta) where.fecha_programada = { [Op.between]: [desde, hasta] };
  else if (desde) where.fecha_programada = { [Op.gte]: desde };
  else if (hasta) where.fecha_programada = { [Op.lte]: hasta };

  const rows = await models.Tarea.findAll({
    where,
    attributes: ['estado', [fn('COUNT', col('estado')), 'cnt']],
    group: ['estado'],
    order: [['estado','ASC']]
  });

  const porEstado = {};
  let total = 0;
  for (const r of rows) {
    const e = r.get('estado');
    const c = Number(r.get('cnt'));
    porEstado[e] = c;
    total += c;
  }

  return {
    filtros: { lote_id, desde, hasta },
    total,
    porEstado
  };
};
