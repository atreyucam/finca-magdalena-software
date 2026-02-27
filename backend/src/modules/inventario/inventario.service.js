// backend/src/modules/inventario/inventario.service.js
const { Op } = require("sequelize");
const { models, sequelize } = require("../../db");
const notif = require("../notificaciones/notificaciones.service");
const units = require("../../utils/units"); // ✅ Tu nueva utilidad estática creada en la Sección 1

// --- Helpers de Error ---
function badRequest(m = "Solicitud inválida") {
    const e = new Error(m); e.status = 400; e.code = "BAD_REQUEST"; return e;
}
function notFound(m = "No encontrado") {
    const e = new Error(m); e.status = 404; e.code = "NOT_FOUND"; return e;
}

// --- Helper de Conversión (Puente DB <-> Utils) ---
// Helper Conversión Seguro
async function getFactorDinamico(unidadIdOrigen, unidadIdDestino) {
    if (String(unidadIdOrigen) === String(unidadIdDestino)) return 1;

    const [uOrigen, uDestino] = await Promise.all([
        models.Unidad.findByPk(unidadIdOrigen),
        models.Unidad.findByPk(unidadIdDestino)
    ]);
    if (!uOrigen || !uDestino) throw badRequest("Unidades no encontradas para conversión");

    // Intenta usar la utilidad, sino devuelve 1 (para evitar crash si falta config)
    try {
        return units.getFactorConversion(uOrigen.codigo, uDestino.codigo);
    } catch (e) {
        console.error("Error calculando factor conversión:", e);
        return 1; // Fallback de seguridad
    }
}

// ============================================================
// 🧠 LÓGICA CORE: MOVIMIENTO DE STOCK (FEFO & LOTES)
// ============================================================

// ============================================================
// 🧠 CORE: MOVER STOCK
// ============================================================
async function moverStock({ t, item, tipo, cantidad, unidad_id, motivo, referencia, datosLote }) {
    const factor = await getFactorDinamico(unidad_id, item.unidad_id);
    const cantBase = Number(cantidad) * factor;

    if (cantBase <= 0 && tipo !== 'AJUSTE_SALIDA') throw badRequest("La cantidad debe ser mayor a 0");

    let stockResultante = Number(item.stock_actual);
    let loteIdMovimiento = null;
    
    // Detectar si es entrada positiva al stock
    const esEntrada = ['ENTRADA', 'AJUSTE_ENTRADA', 'PRESTAMO_DEVUELTA'].includes(tipo);

    // --- A. ENTRADAS ---
    if (esEntrada) {
        // Gestión de lotes para insumos (OPCIÓN B: sumar si el lote ya existe)
if (item.categoria === 'Insumo' && tipo !== 'PRESTAMO_DEVUELTA') {
  const codigoLote =
    datosLote?.codigo_lote_proveedor ||
    datosLote?.codigo_lote ||
    `GEN-${new Date().toISOString().split('T')[0]}`;

  const fechaVenc = datosLote?.fecha_vencimiento || null;

  // ✅ Regla recomendada: si es Insumo y es Entrada, exigir fecha de vencimiento
  // (si tienes insumos NO perecibles, me avisas y lo hacemos condicional por meta)
  if (!fechaVenc) {
    throw badRequest("Para ENTRADAS de insumos, la fecha de vencimiento es obligatoria");
  }

  // ✅ Buscar si ya existe ese lote EXACTO (mismo código + mismo vencimiento)
  let lote = await models.InventarioLote.findOne({
    where: {
      item_id: item.id,
      codigo_lote_proveedor: codigoLote,
      fecha_vencimiento: fechaVenc
    },
    transaction: t,
    lock: t.LOCK.UPDATE
  });

  if (lote) {
    // ✅ SUMAR al lote existente
    lote.cantidad_inicial = (Number(lote.cantidad_inicial) + cantBase).toFixed(3);
    lote.cantidad_actual  = (Number(lote.cantidad_actual) + cantBase).toFixed(3);
    lote.activo = true;

    // opcional: acumular observaciones (si quieres)
    if (motivo) {
      const prev = lote.observaciones ? `${lote.observaciones}\n` : "";
      lote.observaciones = `${prev}${new Date().toISOString()}: +${cantBase.toFixed(3)} (${motivo})`;
    }

    await lote.save({ transaction: t });
  } else {
    // ✅ Crear lote nuevo
    lote = await models.InventarioLote.create({
      item_id: item.id,
      codigo_lote_proveedor: codigoLote,
      fecha_vencimiento: fechaVenc,
      cantidad_inicial: cantBase.toFixed(3),
      cantidad_actual: cantBase.toFixed(3),
      activo: true,
      observaciones: motivo || null
    }, { transaction: t });
  }

  loteIdMovimiento = lote.id;
}

stockResultante += cantBase;

    } 
    // --- B. SALIDAS ---
    else {
        // Validación Global
        if (stockResultante < cantBase) {
            throw badRequest(`Stock insuficiente. Tienes ${stockResultante}, intentas sacar ${cantBase}.`);
        }

        // FEFO (First Expired, First Out) para Insumos
        if (item.categoria === 'Insumo') {
            let restante = cantBase;
            const lotes = await models.InventarioLote.findAll({
                where: { item_id: item.id, activo: true, cantidad_actual: { [Op.gt]: 0 } },
                order: [
  ['fecha_vencimiento', 'ASC'],
  ['created_at', 'ASC']
],
 
                transaction: t,
                lock: t.LOCK.UPDATE 
            });

            for (const lote of lotes) {
                if (restante <= 0) break;
                const disponible = Number(lote.cantidad_actual);
                const aTomar = Math.min(restante, disponible);

                lote.cantidad_actual = (disponible - aTomar).toFixed(3);
                if (Number(lote.cantidad_actual) === 0) lote.activo = false;
                
                await lote.save({ transaction: t });
                restante -= aTomar;
                if (!loteIdMovimiento) loteIdMovimiento = lote.id;
            }
        }
        stockResultante -= cantBase;
    }

    // Actualizar Maestro
    item.stock_actual = stockResultante.toFixed(3);
    await item.save({ transaction: t });

    // Registro Histórico
    await models.InventarioMovimiento.create({
        item_id: item.id,
        lote_id: loteIdMovimiento,
        tipo, 
        cantidad, 
        unidad_id,
        factor_a_unidad_base: factor,
        cantidad_en_base: cantBase.toFixed(3),
        stock_resultante: stockResultante.toFixed(3),
        motivo: motivo || null,
        referencia: referencia || {},
    }, { transaction: t });

    // Alerta Stock Bajo (Silenciosa)
    if (Number(item.stock_actual) < Number(item.stock_minimo) && item.activo) {
        try {
            await notif.crearParaRoles(['Propietario','Tecnico'], {
                tipo: 'Inventario',
                titulo: `Stock bajo: ${item.nombre}`,
                mensaje: `Quedan ${item.stock_actual}`,
                prioridad: 'Alerta'
            });
        } catch (e) { /* Ignorar error notif */ }
    }

    return { stock_actual: stockResultante };
}

// ============================================================
// 🚀 FUNCIONES EXPORTADAS (CRUD y Operaciones)
// ============================================================

exports.crearItem = async (data) => {
  const { nombre, categoria = "Insumo", unidad_id, stock_minimo = 0, stock_inicial = 0, lote_inicial } = data;

  if (!nombre) throw badRequest("Nombre obligatorio");
  if (!unidad_id) throw badRequest("Unidad obligatoria");

  const creado = await sequelize.transaction(async (t) => {
    const item = await models.InventarioItem.create({
        nombre,
        categoria,
        unidad_id,
        stock_minimo,
        stock_actual: 0,
        meta: {
            ingrediente_activo: data.ingrediente_activo || null,
            formulacion: data.formulacion || null,
            proveedor: data.proveedor || null,
        },
      }, { transaction: t });

    if (Number(stock_inicial) > 0) {
      await moverStock({
        t, item,
        tipo: "ENTRADA",
        cantidad: stock_inicial,
        unidad_id,
        motivo: "Inventario Inicial",
        datosLote: lote_inicial // Pasa directo el objeto { codigo_lote_proveedor, fecha_vencimiento }
      });
    }
    return item.toJSON();
  });

  // Notificación en vivo para paneles de administración
  try {
    await notif.crearParaRoles(['Propietario', 'Tecnico'], {
      tipo: 'Inventario',
      titulo: 'Nuevo ítem de inventario',
      mensaje: `Se creó el ítem "${creado.nombre}" (${creado.categoria}).`,
      referencia: { item_id: creado.id },
      prioridad: 'Info',
    });
  } catch (e) {
    // No romper flujo principal de inventario por una falla de notificaciones
    console.error('No se pudo emitir notificación de creación de ítem:', e?.message || e);
  }

  return creado;
};

/**
 * ⚡ LAZY CALCULATION: Calcular disponible en tiempo real.
 * Elimina la necesidad de la tabla InventarioReserva.
 * Disponible = Físico - (Suma items en Tareas Pendientes) - (Préstamos Activos)
 */
// backend/src/modules/inventario/inventario.service.js

// backend/src/modules/inventario/inventario.service.js
exports.listarItems = async ({ q, categoria, activos, page = 1, pageSize = 15, limit }) => {
  const where = {};
  if (q) where.nombre = { [Op.iLike]: `%${q}%` };
  if (categoria && categoria !== "all") where.categoria = categoria;
  if (activos === "true") where.activo = true;
  else if (activos === "false") where.activo = false;

  const size = Number(limit ?? pageSize ?? 20);
  const pageNum = Math.max(1, Number(page || 1));
  const offset = (pageNum - 1) * size;

  const { rows, count } = await models.InventarioItem.findAndCountAll({
    where,
    distinct: true, // ✅ clave con include hasMany (Lotes) para que count no se infle
    include: [
      { model: models.Unidad, attributes: ["codigo"] },
      {
        model: models.InventarioLote,
        as: "Lotes",
        where: { activo: true, cantidad_actual: { [Op.gt]: 0 } },
        required: false,
      },
    ],
    order: [["nombre", "ASC"]],
    limit: size,
    offset,
  });

  const totalPages = Math.max(1, Math.ceil(count / size));

  return {
    total: count,
    page: pageNum,
    pageSize: size,
    totalPages,
    data: rows.map((it) => ({
      id: it.id,
      nombre: it.nombre,
      categoria: it.categoria,
      activo: it.activo,
      unidad: it.Unidad?.codigo,
      stock_actual: it.stock_actual,
      stock_minimo: it.stock_minimo,
      lotes: it.Lotes || [],
      proveedor: it.meta?.proveedor,
      formulacion: it.meta?.formulacion,
      ingrediente_activo: it.meta?.ingrediente_activo,
    })),
  };
};


exports.editarItem = async (id, data) => {
    const item = await models.InventarioItem.findByPk(id);
    if (!item) throw notFound();
    await item.update(data);
    return item.toJSON();
};

exports.ajustarStock = async (currentUser, itemId, body) => {
    const { tipo, cantidad, unidad_id, motivo, datos_lote } = body;
    const item = await models.InventarioItem.findByPk(itemId);
    if (!item) throw notFound();

    return await sequelize.transaction(async (t) => {
        return await moverStock({
            t, item, tipo, cantidad, unidad_id, motivo,
            referencia: { user_id: currentUser.sub, ajuste: true },
            datosLote: datos_lote // Recibimos snake_case del front, pasamos camelCase al helper
        });
    });
};

exports.listarMovimientos = async ({ item_id, desde, hasta, tipo, page = 1, pageSize = 50 }) => {
    const where = {};
    if (item_id) where.item_id = +item_id;
    if (tipo) where.tipo = tipo;
    if (desde && hasta) where.fecha = { [Op.between]: [desde, hasta] };

    const offset = (page - 1) * pageSize;
    const { rows, count } = await models.InventarioMovimiento.findAndCountAll({
        where,
        order: [["fecha", "DESC"], ["id", "DESC"]],
        limit: +pageSize,
        offset,
        include: [
            { model: models.InventarioItem, attributes: ["nombre"] },
            { model: models.Unidad, attributes: ["codigo"] },
            { model: models.InventarioLote, attributes: ["codigo_lote_proveedor"] } 
        ],
    });

    return {
        total: count,
        page: +page,
        pageSize: +pageSize,
        data: rows.map((m) => ({
            id: m.id,
            item: m.InventarioItem?.nombre,
            lote: m.InventarioLote?.codigo_lote_proveedor || 'N/A',
            tipo: m.tipo,
            cantidad: m.cantidad,
            unidad: m.Unidad?.codigo,
            fecha: m.fecha,
            motivo: m.motivo,
            referencia: m.referencia,
        })),
    };
};

// ============================================================
// FUNCIONES DE HERRAMIENTAS (Préstamos)
// ============================================================

exports.prestarHerramienta = async (currentUser, itemId, body) => {
    const { usuario_id, observacion, fecha_estimada_devolucion } = body || {};
    if (!usuario_id) throw badRequest('usuario_id es obligatorio');
  
    const [item, usuario] = await Promise.all([
      models.InventarioItem.findByPk(itemId),
      models.Usuario.findByPk(usuario_id, { attributes: ['id','estado'] })
    ]);
    if (!item) throw notFound('Ítem no encontrado');
    if (item.categoria !== 'Herramienta' && item.categoria !== 'Equipo') throw badRequest('El ítem no es prestable');
    if (!usuario || usuario.estado !== 'Activo') throw badRequest('Usuario inválido');

    // Validación duplicados
    const ya = await models.HerramientaPrestamo.findOne({ where: { item_id: item.id, usuario_id, estado: 'Prestada' } });
    if (ya) throw badRequest('Ya existe un préstamo pendiente para este usuario');

    const prestamo = await sequelize.transaction(async (t) => {
      const p = await models.HerramientaPrestamo.create({
        item_id: item.id,
        usuario_id,
        observacion: observacion || null,
        fecha_estimada_devolucion: fecha_estimada_devolucion || null
      }, { transaction: t });
  
      // Registro de movimiento (sin afectar stock físico, solo registro)
      await models.InventarioMovimiento.create({
        item_id: item.id,
        tipo: 'PRESTAMO_SALIDA',
        cantidad: '1',
        unidad_id: item.unidad_id,
        factor_a_unidad_base: 1,
        cantidad_en_base: '1',
        stock_resultante: item.stock_actual,
        motivo: 'Préstamo herramienta',
        referencia: { usuario_id, prestamo_id: p.id }
      }, { transaction: t });
      
      return p;
    });
  
    // Notificación
    try {
      await notif.crear(usuario_id, {
        tipo: 'Inventario',
        titulo: `Herramienta prestada: ${item.nombre}`,
        mensaje: 'Recuerda devolverla al terminar.',
        referencia: { item_id: item.id, prestamo_id: prestamo.id },
        prioridad: 'Info'
      });
    } catch(e){ console.error(e); }
  
    return prestamo.toJSON();
};

exports.devolverHerramienta = async (currentUser, itemId, body) => {
    const { usuario_id, estado = 'Devuelta', observacion } = body || {};
    if (!usuario_id) throw badRequest('usuario_id es obligatorio');
  
    const item = await models.InventarioItem.findByPk(itemId);
    if (!item) throw notFound('Ítem no encontrado');
    
    const prestamo = await models.HerramientaPrestamo.findOne({
      where: { item_id: itemId, usuario_id, estado: 'Prestada' }
    });
    if (!prestamo) throw notFound('No hay préstamo pendiente');

    await sequelize.transaction(async (t) => {
      prestamo.estado = estado;
      prestamo.fecha_devolucion = new Date();
      if (observacion) prestamo.observacion = observacion;
      await prestamo.save({ transaction: t });
  
      const tipoMov = (estado === 'Dañada' || estado === 'Extraviada') ? 'BAJA' : 'PRESTAMO_DEVUELTA';
      
      if (tipoMov === 'BAJA') {
          // Si se perdió, ahora SÍ afectamos el stock real
          await moverStock({
              t, item, tipo: 'BAJA', cantidad: 1, unidad_id: item.unidad_id,
              motivo: `Herramienta ${estado} por usuario ${usuario_id}`,
              referencia: { usuario_id, prestamo_id: prestamo.id }
          });
      } else {
          // Solo registro
          await models.InventarioMovimiento.create({
            item_id: itemId,
            tipo: 'PRESTAMO_DEVUELTA',
            cantidad: '1',
            unidad_id: item.unidad_id,
            factor_a_unidad_base: 1,
            cantidad_en_base: '1',
            stock_resultante: item.stock_actual,
            motivo: `Devolución (${estado})`,
            referencia: { usuario_id, prestamo_id: prestamo.id }
          }, { transaction: t });
      }
    });
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
    return list.map(p => ({
        id: p.id,
        item: p.InventarioItem?.nombre,
        usuario: p.Usuario ? `${p.Usuario.nombres} ${p.Usuario.apellidos}` : p.usuario_id,
        fecha_salida: p.fecha_salida,
        observacion: p.observacion
    }));
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

exports.editarLote = async (loteId, data) => {
  const lote = await models.InventarioLote.findByPk(loteId);
  if (!lote) throw notFound("Lote no encontrado");

  const fields = ["codigo_lote_proveedor", "fecha_vencimiento", "activo", "observaciones"];
  fields.forEach((f) => {
    if (f in data) lote[f] = data[f];
  });

  await lote.save();
  return lote.toJSON();
};


exports.buscarLote = async (itemId, { codigo, fecha_vencimiento }) => {
  if (!itemId) throw badRequest("itemId inválido");
  if (!codigo || !String(codigo).trim()) throw badRequest("codigo es obligatorio");

  const where = {
    item_id: itemId,
    codigo_lote_proveedor: String(codigo).trim(),
    activo: true,
  };

  // ✅ Si mandas fecha, valida coincidencia exacta (DATEONLY)
  if (fecha_vencimiento) where.fecha_vencimiento = fecha_vencimiento;

  const lote = await models.InventarioLote.findOne({
    where,
    order: [["created_at", "DESC"]],
  });

  if (!lote) return { existe: false };

  return {
    existe: true,
    lote: {
      id: lote.id,
      codigo_lote_proveedor: lote.codigo_lote_proveedor,
      fecha_vencimiento: lote.fecha_vencimiento,
      cantidad_actual: lote.cantidad_actual,
    },
  };
};


// ⚡ Helpers exportados para uso interno
exports._moverStock = moverStock;
exports._getFactor = getFactorDinamico;
