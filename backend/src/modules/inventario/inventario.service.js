// backend/src/modules/inventario/inventario.service.js
const { Op } = require("sequelize");
const { models, sequelize } = require("../../db");
const notif = require("../notificaciones/notificaciones.service");

function badRequest(m = "Solicitud inválida") {
    const e = new Error(m);
    e.status = 400;
    e.code = "BAD_REQUEST";
    return e;
}
function notFound(m = "No encontrado") {
    const e = new Error(m);
    e.status = 404;
    e.code = "NOT_FOUND";
    return e;
}

async function findUnidadBy({ id, codigo }) {
    if (id) return models.Unidad.findByPk(id);
    if (codigo) return models.Unidad.findOne({ where: { codigo } });
    return null;
}

async function getFactor(from_unidad_id, to_unidad_id) {
    if (from_unidad_id === to_unidad_id) return 1;
    const direct = await models.ConversionUnidad.findOne({
        where: { from_unidad_id, to_unidad_id },
    });
    if (direct) return Number(direct.factor);
    const inverse = await models.ConversionUnidad.findOne({
        where: { from_unidad_id: to_unidad_id, to_unidad_id: from_unidad_id },
    });
    if (inverse) return 1 / Number(inverse.factor);
    throw badRequest("No existe conversión de unidades configurada");
}

async function moverStock({ t, item, tipo, cantidad, unidad_id, motivo, referencia }){
  const factor = await getFactor(unidad_id, item.unidad_id);
  const cantBase = Number(cantidad) * factor;
  const signo = (tipo === 'ENTRADA' || tipo === 'AJUSTE_ENTRADA' || tipo === 'PRESTAMO_DEVUELTA') ? 1 : -1;
  const delta = signo * cantBase;

  const itemLocked = await models.InventarioItem.findByPk(item.id, { transaction: t, lock: t.LOCK.UPDATE });
  const nuevo = Number(itemLocked.stock_actual) + delta;
  if (nuevo < 0) {
    const e = badRequest(`Stock insuficiente para ${itemLocked.nombre}`);
    e.code = 'LOW_STOCK';
    e.details = { item_id: item.id, stock_actual: itemLocked.stock_actual, requerido_en_base: Math.abs(delta) };
    throw e;
  }
  itemLocked.stock_actual = nuevo.toFixed(3);
  await itemLocked.save({ transaction: t });

  const mov = await models.InventarioMovimiento.create({
    item_id: item.id, tipo, cantidad, unidad_id,
    factor_a_unidad_base: factor,
    cantidad_en_base: Math.abs(delta).toFixed(3),
    stock_resultante: itemLocked.stock_actual,
    motivo: motivo || null,
    referencia: referencia || {},
  }, { transaction: t });

  // 🔔 Notificación de stock bajo
  if (Number(itemLocked.stock_actual) < Number(itemLocked.stock_minimo)) {
    try {
      await notif.crearParaRoles(['Propietario','Tecnico'], {
        tipo: 'Inventario',
        titulo: `Stock bajo: ${itemLocked.nombre}`,
        mensaje: `Stock actual ${itemLocked.stock_actual} < mínimo ${itemLocked.stock_minimo}`,
        referencia: { item_id: itemLocked.id },
        prioridad: 'Alerta'
      });
    } catch (e) { console.error('notif stock bajo', e); }
  }

  return mov;
}


exports.crearItem = async (data) => {
    const {
        nombre,
        categoria = "Insumo",
        unidad_id,
        unidad_codigo,
        stock_minimo = 0,
        stock_inicial = 0,
        meta = {},
    } = data;
    if (!nombre) throw badRequest("nombre es obligatorio");
    const unidad = await findUnidadBy({ id: unidad_id, codigo: unidad_codigo });
    if (!unidad) throw badRequest("unidad inválida");
    const item = await models.InventarioItem.create({
        nombre,
        categoria,
        unidad_id: unidad.id,
        stock_minimo,
        stock_actual: stock_inicial,
        meta,
    });
    return item.toJSON();
};

// backend/src/modules/inventario/inventario.service.js
exports.listarItems = async ({ q, categoria, activos }) => {
  const where = {};
  if (q) where.nombre = { [Op.iLike]: `%${q}%` };
  if (categoria) where.categoria = categoria;
  if (activos === "true" || activos === true) where.activo = true;
  else if (activos === "false" || activos === false) where.activo = false;

  const list = await models.InventarioItem.findAll({
    where,
    include: [{ model: models.Unidad, attributes: ["codigo", "nombre"] }],
    order: [["nombre", "ASC"]],
  });

  // Pre-cargar reservas y préstamos
  const ids = list.map(i => i.id);
  const reservas = await models.InventarioReserva.findAll({
    attributes: ['item_id', [sequelize.fn('SUM', sequelize.col('cantidad_en_base')), 'sum']],
    where: { item_id: { [Op.in]: ids }, estado: 'Reservada' },
    group: ['item_id'],
    raw: true
  });
  const reservasMap = Object.fromEntries(reservas.map(r => [Number(r.item_id), Number(r.sum)]));

  const prestamos = await models.HerramientaPrestamo.findAll({
    attributes: ['item_id', [sequelize.fn('COUNT', '*'), 'cnt']],
    where: { item_id: { [Op.in]: ids }, estado: 'Prestada' },
    group: ['item_id'],
    raw: true
  });
  const prestamosMap = Object.fromEntries(prestamos.map(p => [Number(p.item_id), Number(p.cnt)]));

  return list.map((i) => {
    const reservasAct = Number(reservasMap[i.id] || 0);
    const prestadas = (i.categoria === 'Herramienta' || i.categoria === 'Equipo') ? Number(prestamosMap[i.id] || 0) : 0;
    const disponible = Number(i.stock_actual) - reservasAct - prestadas;

    return {
      id: i.id,
      nombre: i.nombre,
      categoria: i.categoria,
      unidad: i.Unidad?.codigo,
      stock_actual: i.stock_actual,
      stock_minimo: i.stock_minimo,
      activo: i.activo,
      tipo: i.meta?.tipo || null,
      formulacion: i.meta?.formulacion || null,
      proveedor: i.meta?.proveedor || null,
      disponible: disponible.toFixed(3),
    };
  });
};



exports.editarItem = async (id, data) => {
    const item = await models.InventarioItem.findByPk(id);
    if (!item) throw notFound('Ítem no encontrado');
    const fields = ["nombre", "categoria", "stock_minimo", "activo"];
    for (const f of fields) if (f in data) item[f] = data[f];
    if (data.unidad_id || data.unidad_codigo) {
        const u = await findUnidadBy({
            id: data.unidad_id,
            codigo: data.unidad_codigo,
        });
        if (!u) throw badRequest("unidad inválida");
        item.unidad_id = u.id;
    }
    await item.save();
    return item.toJSON();
};

exports.ajustarStock = async (currentUser, itemId, body) => {
    const { tipo, cantidad, unidad_id, unidad_codigo, motivo } = body || {};
    if (!tipo || !cantidad)
        throw badRequest("tipo y cantidad son obligatorios");
    if (
        ![
            "AJUSTE_ENTRADA",
            "AJUSTE_SALIDA",
            "ENTRADA",
            "SALIDA",
            "BAJA",
        ].includes(tipo)
    )
        throw badRequest("tipo inválido");
    const item = await models.InventarioItem.findByPk(itemId);
    if (!item) throw notFound("Ítem no encontrado");
    const unidad = await findUnidadBy({ id: unidad_id, codigo: unidad_codigo });
    if (!unidad) throw badRequest("unidad inválida");

    return await sequelize.transaction(async (t) => {
        const mov = await moverStock({
            t,
            item,
            tipo,
            cantidad,
            unidad_id: unidad.id,
            motivo,
            referencia: { user_id: currentUser.sub },
        });
        return mov.toJSON();
    });
};

exports.listarMovimientos = async ({
    item_id,
    desde,
    hasta,
    tipo,
    page = 1,
    pageSize = 50,
}) => {
    const where = {};
    if (item_id) where.item_id = +item_id;
    if (tipo) where.tipo = tipo;
    if (desde && hasta) where.fecha = { [Op.between]: [desde, hasta] };
    else if (desde) where.fecha = { [Op.gte]: desde };
    else if (hasta) where.fecha = { [Op.lte]: hasta };
    const offset = (page - 1) * pageSize;
    const { rows, count } = await models.InventarioMovimiento.findAndCountAll({
        where,
        order: [
            ["fecha", "DESC"],
            ["id", "DESC"],
        ],
        limit: +pageSize,
        offset,
        include: [
            { model: models.InventarioItem, attributes: ["nombre"] },
            { model: models.Unidad, attributes: ["codigo"] },
        ],
    });
    return {
        total: count,
        page: +page,
        pageSize: +pageSize,
        data: rows.map((m) => ({
            id: m.id,
            item: m.InventarioItem?.nombre,
            tipo: m.tipo,
            cantidad: m.cantidad,
            unidad: m.Unidad?.codigo,
            factor_a_unidad_base: m.factor_a_unidad_base,
            cantidad_en_base: m.cantidad_en_base,
            stock_resultante: m.stock_resultante,
            fecha: m.fecha,
            motivo: m.motivo,
            referencia: m.referencia,
        })),
    };
};

exports.prestarHerramienta = async (currentUser, itemId, body) => {
  const { usuario_id, observacion, fecha_estimada_devolucion } = body || {};
  if (!usuario_id) throw badRequest('usuario_id es obligatorio');

  const [item, usuario] = await Promise.all([
    models.InventarioItem.findByPk(itemId),
    models.Usuario.findByPk(usuario_id, { attributes: ['id','estado','nombres','apellidos'] })
  ]);
  if (!item) throw notFound('Ítem no encontrado');
  if (item.categoria !== 'Herramienta') throw badRequest('El ítem no es herramienta');
  if (!usuario || usuario.estado !== 'Activo') throw badRequest('usuario_id inválido o inactivo');

  // Evita préstamo duplicado del mismo ítem al mismo usuario
  const ya = await models.HerramientaPrestamo.findOne({ where: { item_id: item.id, usuario_id, estado: 'Prestada' } });
  if (ya) throw badRequest('Ya existe un préstamo pendiente para este usuario y herramienta');

  const prestamo = await sequelize.transaction(async (t) => {
    const p = await models.HerramientaPrestamo.create({
      item_id: item.id,
      usuario_id,
      observacion: observacion || null,
      fecha_estimada_devolucion: fecha_estimada_devolucion || null
    }, { transaction: t });

    // Registro de movimiento (trazabilidad; no cambiamos stock)
    await models.InventarioMovimiento.create({
      item_id: item.id,
      tipo: 'PRESTAMO_SALIDA',
      cantidad: '1',
      unidad_id: item.unidad_id,
      factor_a_unidad_base: 1,
      cantidad_en_base: '1',
      stock_resultante: item.stock_actual, // no cambia stock
      motivo: 'Préstamo herramienta',
      referencia: { usuario_id, prestamo_id: p.id }
    }, { transaction: t });

    return p;
  });

  // Notificación al trabajador
  try {
    await notif.crear(usuario_id, {
      tipo: 'Inventario',
      titulo: `Herramienta prestada: ${item.nombre}`,
      mensaje: fecha_estimada_devolucion
        ? `Debes devolverla antes de ${new Date(fecha_estimada_devolucion).toISOString().slice(0,10)}`
        : 'Recuerda devolverla al terminar la tarea',
      referencia: { item_id: item.id, prestamo_id: prestamo.id },
      prioridad: 'Info'
    });
  } catch(e){ console.error('notif prestamo', e); }

  return prestamo.toJSON();
};


exports.devolverHerramienta = async (currentUser, itemId, body) => {
  const { usuario_id, estado = 'Devuelta', observacion } = body || {};
  if (!usuario_id) throw badRequest('usuario_id es obligatorio');
  if (!['Devuelta','Dañada','Extraviada'].includes(estado)) throw badRequest('estado de devolución inválido');

  const item = await models.InventarioItem.findByPk(itemId);
  if (!item) throw notFound('Ítem no encontrado');
  if (item.categoria !== 'Herramienta') throw badRequest('El ítem no es herramienta');

  const prestamo = await models.HerramientaPrestamo.findOne({
    where: { item_id: itemId, usuario_id, estado: 'Prestada' }
  });
  if (!prestamo) throw notFound('No hay préstamo pendiente para este usuario/ítem');

  await sequelize.transaction(async (t) => {
    prestamo.estado = estado;
    prestamo.fecha_devolucion = new Date();
    if (observacion) prestamo.observacion = observacion;
    await prestamo.save({ transaction: t });

    await models.InventarioMovimiento.create({
      item_id: itemId,
      tipo: 'PRESTAMO_DEVUELTA',
      cantidad: '1',
      unidad_id: item.unidad_id,
      factor_a_unidad_base: 1,
      cantidad_en_base: '1',
      stock_resultante: item.stock_actual, // no cambia stock
      motivo: `Devolución (${estado})`,
      referencia: { usuario_id, prestamo_id: prestamo.id }
    }, { transaction: t });
  });

  // Notificar al usuario y (opcional) a Técnicos si fue Dañada/Extraviada
  try {
    await notif.crear(usuario_id, {
      tipo: 'Inventario',
      titulo: `Devolución registrada: ${item.nombre}`,
      mensaje: `Estado: ${estado}`,
      referencia: { item_id: item.id, prestamo_id: prestamo.id },
      prioridad: 'Info'
    });
    if (estado !== 'Devuelta') {
      await notif.crearParaRoles(['Tecnico','Propietario'], {
        tipo: 'Inventario',
        titulo: `Atención: herramienta ${estado}`,
        mensaje: `${item.nombre} devuelta como ${estado}`,
        referencia: { item_id: item.id, prestamo_id: prestamo.id },
        prioridad: 'Alerta'
      });
    }
  } catch(e){ console.error('notif devolucion', e); }

  return prestamo.toJSON();
};


exports.listarNoDevueltas = async () => {
  const list = await models.HerramientaPrestamo.findAll({
    where: { estado: 'Prestada' },
    include: [
      { model: models.InventarioItem, attributes: ['nombre'] },
      { model: models.Usuario, attributes: ['nombres','apellidos'] }
    ],
    order: [['fecha_salida','ASC']]
  });

  return list.map(p => {
    const fechaEst = p.fecha_estimada_devolucion ? new Date(p.fecha_estimada_devolucion) : null;
    const dias_atraso = fechaEst ? Math.max(0, Math.ceil((Date.now() - fechaEst.getTime()) / 86400000)) : null;
    return {
      id: p.id,
      item: p.InventarioItem?.nombre,
      usuario: p.Usuario ? `${p.Usuario.nombres} ${p.Usuario.apellidos}` : p.usuario_id,
      fecha_salida: p.fecha_salida,
      fecha_estimada_devolucion: p.fecha_estimada_devolucion,
      dias_atraso,
      observacion: p.observacion
    };
  });
};


exports.alertasStockBajo = async () => {
  const items = await models.InventarioItem.findAll({
    where: { activo: true },
    include: [{ model: models.Unidad, attributes: ['codigo'] }]
  });

  return items
    .filter(i => Number(i.stock_actual) < Number(i.stock_minimo))
    .map(i => ({
      id: i.id,
      nombre: i.nombre,
      stock_actual: i.stock_actual,
      stock_minimo: i.stock_minimo,
      unidad: i.Unidad?.codigo
    }));
};


// ===== Helper expuesto para tareas =====
exports._moverStock = moverStock; // para reutilizar en tareas.service (consumo automático)
exports._getFactor = getFactor;
