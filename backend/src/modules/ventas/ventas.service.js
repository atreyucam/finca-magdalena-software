const { Op } = require("sequelize");
const { models, sequelize } = require("../../db");
const notificacionesService = require("../notificaciones/notificaciones.service");

const TIPOS_VENTA = Object.freeze({
  EXPORTACION: "EXPORTACION",
  NACIONAL: "NACIONAL",
});

const ESTADOS_VENTA = Object.freeze({
  PENDIENTE: "PENDIENTE",
  LIQUIDADA: "LIQUIDADA",
  PAGADA: "PAGADA",
  CANCELADA: "CANCELADA",
});

const FORMAS_PAGO_VALIDAS = new Set(["EFECTIVO", "TRANSFERENCIA", "CHEQUE", "OTRO"]);

const CLASES_POR_TIPO = Object.freeze({
  [TIPOS_VENTA.EXPORTACION]: ["grande", "pequena"],
  [TIPOS_VENTA.NACIONAL]: ["primera", "segunda", "tercera", "cuarta", "quinta"],
});

function badRequest(message = "Solicitud invalida") {
  const e = new Error(message);
  e.status = 400;
  e.code = "BAD_REQUEST";
  return e;
}

function forbidden(message = "Prohibido") {
  const e = new Error(message);
  e.status = 403;
  e.code = "FORBIDDEN";
  return e;
}

function notFound(message = "No encontrado") {
  const e = new Error(message);
  e.status = 404;
  e.code = "NOT_FOUND";
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

function normalizeForCompare(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function asPositiveInteger(value, fieldName) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    throw badRequest(`${fieldName} debe ser un entero positivo`);
  }
  return n;
}

function asPositiveNumber(value, fieldName) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    throw badRequest(`${fieldName} debe ser mayor a 0`);
  }
  return n;
}

function asNonNegativeNumber(value, fieldName) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw badRequest(`${fieldName} debe ser mayor o igual a 0`);
  }
  return n;
}

function toMoney(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function toQty(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function toWeight(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 1000) / 1000;
}

function normalizeDate(value, { fieldName = "fecha", fallbackToday = false } = {}) {
  if (value === undefined || value === null || value === "") {
    if (fallbackToday) return new Date().toISOString().slice(0, 10);
    return null;
  }

  const raw = String(value).trim();
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    throw badRequest(`${fieldName} invalida`);
  }
  return d.toISOString().slice(0, 10);
}

function normalizeTipoVenta(value) {
  const normalized = normalizeText(value, { upper: true });
  if (!normalized || !Object.values(TIPOS_VENTA).includes(normalized)) {
    throw badRequest("tipo_venta debe ser EXPORTACION o NACIONAL");
  }
  return normalized;
}

function normalizeClase(value) {
  const normalized = normalizeForCompare(value);
  if (normalized === "pequena" || normalized === "pequeno") return "pequena";
  return normalized;
}

function normalizeFormaPago(value) {
  const normalized = normalizeText(value, { upper: true });
  if (!normalized || !FORMAS_PAGO_VALIDAS.has(normalized)) {
    throw badRequest("forma_pago invalida");
  }
  return normalized;
}

function claseLabel(clase) {
  if (clase === "pequena") return "pequeña";
  return clase;
}

function normalizeLiquidacionDetalle(tipoVenta, detallesRaw) {
  if (!Array.isArray(detallesRaw) || detallesRaw.length === 0) {
    throw badRequest("La liquidacion debe incluir detalle por clases");
  }

  const clasesPermitidas = CLASES_POR_TIPO[tipoVenta] || [];

  const detalles = detallesRaw.map((row, idx) => {
    const clase = normalizeClase(row?.clase);
    if (!clasesPermitidas.includes(clase)) {
      throw badRequest(`Clase invalida en fila ${idx + 1} para ${tipoVenta}`);
    }

    const pesoKg = asPositiveNumber(row?.peso_kg, `peso_kg (fila ${idx + 1})`);
    const precioUnitario = asPositiveNumber(row?.precio_unitario, `precio_unitario (fila ${idx + 1})`);

    return {
      clase,
      peso_kg: toWeight(pesoKg),
      precio_unitario: Number(precioUnitario),
      subtotal: toMoney(pesoKg * precioUnitario),
    };
  });

  const clasesUnicas = new Set(detalles.map((d) => d.clase));
  if (clasesUnicas.size !== detalles.length) {
    throw badRequest("No se permite repetir la misma clase en la liquidacion");
  }

  return detalles;
}

function normalizarClasificacionCosecha(detalles = {}) {
  const detalle = detalles && typeof detalles === "object" ? detalles : {};

  if (Array.isArray(detalle?.clasificacion)) {
    const acc = { exportacion: 0, nacional: 0, rechazo: 0 };
    for (const row of detalle.clasificacion) {
      const destino = normalizeForCompare(row?.destino);
      const gavetas = Math.max(0, Number(row?.gavetas ?? row?.gabetas ?? 0));
      if (destino.includes("export")) acc.exportacion += gavetas;
      else if (destino.includes("nacional")) acc.nacional += gavetas;
      else if (destino.includes("rechazo")) acc.rechazo += gavetas;
    }
    return acc;
  }

  const base =
    detalle?.clasificacion && typeof detalle.clasificacion === "object"
      ? detalle.clasificacion
      : detalle;

  return {
    exportacion: Math.max(0, Number(base?.exportacion ?? 0)),
    nacional: Math.max(0, Number(base?.nacional ?? 0)),
    rechazo: Math.max(0, Number(base?.rechazo ?? 0)),
  };
}

function mapUsuarioCorto(usuario) {
  if (!usuario) return null;
  const nombre = `${usuario.nombres || ""} ${usuario.apellidos || ""}`.trim();
  return {
    id: usuario.id,
    nombre: nombre || null,
  };
}

function mapVentaLista(venta) {
  return {
    id: venta.id,
    numero_factura: venta.numero_factura,
    numero_recibo: venta.numero_recibo,
    fecha_entrega: venta.fecha_entrega,
    tipo_venta: venta.tipo_venta,
    gavetas_entregadas: toQty(venta.gavetas_entregadas),
    subtotal: toMoney(venta.subtotal),
    total: toMoney(venta.total),
    estado: venta.estado,
    cliente: venta.cliente
      ? {
          id: venta.cliente.id,
          nombre: venta.cliente.nombre,
          identificacion: venta.cliente.identificacion,
        }
      : null,
    lote: venta.lote
      ? {
          id: venta.lote.id,
          nombre: venta.lote.nombre,
          finca: venta.lote.finca
            ? {
                id: venta.lote.finca.id,
                nombre: venta.lote.finca.nombre,
              }
            : null,
        }
      : null,
    created_at: venta.created_at,
    updated_at: venta.updated_at,
  };
}

function mapVentaDetalle(venta) {
  return {
    ...mapVentaLista(venta),
    fecha_liquidacion: venta.fecha_liquidacion,
    fecha_pago: venta.fecha_pago,
    forma_pago: venta.forma_pago,
    observacion: venta.observacion,
    observacion_pago: venta.observacion_pago,
    gavetas_devueltas:
      venta.gavetas_devueltas === null || venta.gavetas_devueltas === undefined
        ? null
        : toQty(venta.gavetas_devueltas),
    gavetas_utiles:
      venta.gavetas_utiles === null || venta.gavetas_utiles === undefined
        ? null
        : toQty(venta.gavetas_utiles),
    reclasificacion: venta.reclasificacion_destino
      ? {
          destino: venta.reclasificacion_destino,
          gavetas: toQty(venta.reclasificacion_gavetas),
          descripcion:
            venta.reclasificacion_destino === "NACIONAL"
              ? "Devolucion comercial de exportacion reclasificada a nacional"
              : "Devolucion comercial de nacional reclasificada a rechazo",
        }
      : null,
    creado_por: mapUsuarioCorto(venta.creador),
    liquidado_por: mapUsuarioCorto(venta.liquidador),
    pagado_por: mapUsuarioCorto(venta.pagador),
    detalles: (venta.detalles || []).map((d) => ({
      id: d.id,
      clase: d.clase,
      clase_label: claseLabel(d.clase),
      peso_kg: toWeight(d.peso_kg),
      precio_unitario: toMoney(d.precio_unitario),
      subtotal: toMoney(d.subtotal),
    })),
  };
}

async function cargarVentaConDetalle(ventaId, options = {}) {
  return models.Venta.findByPk(ventaId, {
    include: [
      {
        model: models.Cliente,
        as: "cliente",
        attributes: ["id", "nombre", "identificacion", "telefono", "correo", "direccion", "activo"],
      },
      {
        model: models.Lote,
        as: "lote",
        attributes: ["id", "nombre", "estado"],
        include: [{ model: models.Finca, as: "finca", attributes: ["id", "nombre"] }],
      },
      {
        model: models.Usuario,
        as: "creador",
        attributes: ["id", "nombres", "apellidos"],
      },
      {
        model: models.Usuario,
        as: "liquidador",
        attributes: ["id", "nombres", "apellidos"],
      },
      {
        model: models.Usuario,
        as: "pagador",
        attributes: ["id", "nombres", "apellidos"],
      },
      {
        model: models.VentaDetalle,
        as: "detalles",
      },
    ],
    order: [[{ model: models.VentaDetalle, as: "detalles" }, "id", "ASC"]],
    transaction: options.transaction,
  });
}

async function obtenerProduccionInicialLote(loteId, options = {}) {
  const tareas = await models.Tarea.findAll({
    where: {
      lote_id: loteId,
      estado: { [Op.in]: ["Completada", "Verificada"] },
    },
    attributes: ["detalles"],
    include: [
      {
        model: models.TipoActividad,
        attributes: ["codigo"],
        required: true,
        where: { codigo: "cosecha" },
      },
    ],
    transaction: options.transaction,
  });

  const initial = { exportacion: 0, nacional: 0, rechazo: 0 };
  for (const tarea of tareas) {
    const clas = normalizarClasificacionCosecha(tarea.detalles || {});
    initial.exportacion += Number(clas.exportacion || 0);
    initial.nacional += Number(clas.nacional || 0);
    initial.rechazo += Number(clas.rechazo || 0);
  }

  return {
    exportacion: toQty(initial.exportacion),
    nacional: toQty(initial.nacional),
    rechazo: toQty(initial.rechazo),
  };
}

async function sumVentas(field, where, options = {}) {
  const value = await models.Venta.sum(field, {
    where,
    transaction: options.transaction,
  });

  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

async function calcularDisponibilidadPorLote(loteId, options = {}) {
  const inicial = await obtenerProduccionInicialLote(loteId, options);

  const estadosConEntrega = [
    ESTADOS_VENTA.PENDIENTE,
    ESTADOS_VENTA.LIQUIDADA,
    ESTADOS_VENTA.PAGADA,
  ];

  const entregasExportacion = await sumVentas(
    "gavetas_entregadas",
    {
      lote_id: loteId,
      tipo_venta: TIPOS_VENTA.EXPORTACION,
      estado: { [Op.in]: estadosConEntrega },
    },
    options
  );

  const entregasNacional = await sumVentas(
    "gavetas_entregadas",
    {
      lote_id: loteId,
      tipo_venta: TIPOS_VENTA.NACIONAL,
      estado: { [Op.in]: estadosConEntrega },
    },
    options
  );

  const devolucionExportacionANacional = await sumVentas(
    "gavetas_devueltas",
    {
      lote_id: loteId,
      tipo_venta: TIPOS_VENTA.EXPORTACION,
      estado: { [Op.in]: [ESTADOS_VENTA.LIQUIDADA, ESTADOS_VENTA.PAGADA] },
    },
    options
  );

  const devolucionNacionalARechazo = await sumVentas(
    "gavetas_devueltas",
    {
      lote_id: loteId,
      tipo_venta: TIPOS_VENTA.NACIONAL,
      estado: { [Op.in]: [ESTADOS_VENTA.LIQUIDADA, ESTADOS_VENTA.PAGADA] },
    },
    options
  );

  const exportacionDisponible =
    Number(inicial.exportacion) - Number(entregasExportacion);
  const nacionalDisponible =
    Number(inicial.nacional) +
    Number(devolucionExportacionANacional) -
    Number(entregasNacional);

  const rechazoComercial = Number(devolucionNacionalARechazo);
  const rechazoAcumulado = Number(inicial.rechazo) + rechazoComercial;

  return {
    exportacion_inicial: toQty(inicial.exportacion),
    nacional_inicial: toQty(inicial.nacional),
    rechazo_inicial_cosecha: toQty(inicial.rechazo),
    entregas_exportacion: toQty(entregasExportacion),
    entregas_nacional: toQty(entregasNacional),
    devolucion_exportacion_a_nacional: toQty(devolucionExportacionANacional),
    devolucion_nacional_a_rechazo: toQty(devolucionNacionalARechazo),
    exportacion_disponible: toQty(Math.max(0, exportacionDisponible)),
    nacional_disponible: toQty(Math.max(0, nacionalDisponible)),
    rechazo_por_devolucion_comercial: toQty(rechazoComercial),
    rechazo_acumulado: toQty(rechazoAcumulado),
  };
}

async function generarNumeroFacturaVenta(options = {}) {
  const lastVenta = await models.Venta.findOne({
    attributes: ["numero_factura"],
    order: [["id", "DESC"]],
    transaction: options.transaction,
    lock: options.transaction?.LOCK?.UPDATE,
  });

  const current = String(lastVenta?.numero_factura || "").match(/VTA-(\d+)/i);
  const lastNumber = current ? Number(current[1]) : 0;
  const nextNumber = lastNumber + 1;

  return `VTA-${String(nextNumber).padStart(6, "0")}`;
}

function assertPuedeRegistrarEntrega(currentUser) {
  if (!["Propietario", "Tecnico"].includes(currentUser?.role)) {
    throw forbidden("Solo Propietario o Tecnico puede registrar entrega");
  }
}

function assertPuedeLiquidarOPagar(currentUser, accion = "operar") {
  if (currentUser?.role !== "Propietario") {
    throw forbidden(`Solo Propietario puede ${accion}`);
  }
}

async function emitirEventoVenta(currentUser, venta, evento) {
  if (!venta?.id) return;

  const configPorEvento = {
    VENTA_ENTREGADA: {
      titulo: "Venta registrada",
      mensaje: `Se registró la entrega de la venta ${venta.numero_factura}.`,
    },
    VENTA_LIQUIDADA: {
      titulo: "Venta liquidada",
      mensaje: `Se liquidó la venta ${venta.numero_factura} por $${toMoney(venta.total).toFixed(2)}.`,
    },
    VENTA_PAGADA: {
      titulo: "Venta pagada",
      mensaje: `Se registró el pago de la venta ${venta.numero_factura}.`,
    },
  };

  const eventConfig = configPorEvento[evento];
  if (!eventConfig) return;

  try {
    await notificacionesService.crearParaRoles(["Propietario", "Tecnico"], {
      tipo: "General",
      titulo: eventConfig.titulo,
      mensaje: eventConfig.mensaje,
      actor_id: currentUser?.sub,
      referencia: {
        tipo_evento: evento,
        venta_id: venta.id,
        numero_factura: venta.numero_factura,
      },
      prioridad: "Info",
      dedupe: {
        windowMs: 5 * 60 * 1000,
        includeMessage: true,
        match: {
          tipo_evento: evento,
          venta_id: venta.id,
        },
      },
    });
  } catch (error) {
    console.error("No se pudo emitir notificacion de venta:", error?.message || error);
  }
}

exports.obtenerDisponibilidadLote = async (loteId) => {
  const loteNum = asPositiveInteger(loteId, "lote_id");

  const lote = await models.Lote.findByPk(loteNum, {
    include: [{ model: models.Finca, as: "finca", attributes: ["id", "nombre"] }],
  });
  if (!lote) throw notFound("Lote no encontrado");

  const disponibilidad = await calcularDisponibilidadPorLote(loteNum);

  return {
    lote: {
      id: lote.id,
      nombre: lote.nombre,
      estado: lote.estado,
      finca: lote.finca
        ? {
            id: lote.finca.id,
            nombre: lote.finca.nombre,
          }
        : null,
    },
    disponibilidad,
  };
};

exports.crearEntrega = async (currentUser, payload = {}) => {
  assertPuedeRegistrarEntrega(currentUser);

  const clienteId = asPositiveInteger(payload.cliente_id, "cliente_id");
  const loteId = asPositiveInteger(payload.lote_id, "lote_id");
  const tipoVenta = normalizeTipoVenta(payload.tipo_venta);
  const fechaEntrega =
    normalizeDate(payload.fecha_entrega, {
      fieldName: "fecha_entrega",
      fallbackToday: true,
    }) || new Date().toISOString().slice(0, 10);
  const gavetasEntregadas = asPositiveNumber(payload.gavetas_entregadas, "gavetas_entregadas");
  const observacion = normalizeText(payload.observacion);

  let ventaId = null;

  try {
    await sequelize.transaction(async (t) => {
      const [cliente, lote] = await Promise.all([
        models.Cliente.findOne({
          where: { id: clienteId, activo: true },
          transaction: t,
          lock: t.LOCK.UPDATE,
        }),
        models.Lote.findOne({
          where: { id: loteId, estado: "Activo" },
          transaction: t,
          lock: t.LOCK.UPDATE,
        }),
      ]);

      if (!cliente) throw badRequest("Cliente no encontrado o inactivo");
      if (!lote) throw badRequest("Lote no encontrado o inactivo");

      const disponibilidad = await calcularDisponibilidadPorLote(loteId, { transaction: t });
      const disponible =
        tipoVenta === TIPOS_VENTA.EXPORTACION
          ? Number(disponibilidad.exportacion_disponible || 0)
          : Number(disponibilidad.nacional_disponible || 0);

      if (gavetasEntregadas > disponible + 1e-9) {
        throw badRequest(
          `La cantidad entregada excede la disponibilidad del lote. Disponible: ${toQty(disponible)}`
        );
      }

      const numeroFactura = await generarNumeroFacturaVenta({ transaction: t });

      const venta = await models.Venta.create(
        {
          numero_factura: numeroFactura,
          cliente_id: clienteId,
          numero_recibo: null,
          fecha_entrega: fechaEntrega,
          lote_id: loteId,
          tipo_venta: tipoVenta,
          gavetas_entregadas: toQty(gavetasEntregadas).toFixed(2),
          gavetas_devueltas: null,
          gavetas_utiles: null,
          subtotal: "0.00",
          total: "0.00",
          estado: ESTADOS_VENTA.PENDIENTE,
          forma_pago: null,
          observacion,
          creado_por: currentUser.sub,
          liquidado_por: null,
          pagado_por: null,
          fecha_liquidacion: null,
          fecha_pago: null,
          observacion_pago: null,
          reclasificacion_destino: null,
          reclasificacion_gavetas: "0.00",
        },
        { transaction: t }
      );

      ventaId = Number(venta.id);
    });
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      throw conflict("No se pudo generar numero_factura unico para la venta");
    }
    throw error;
  }

  if (!ventaId) throw badRequest("No se pudo registrar la venta");

  const venta = await cargarVentaConDetalle(ventaId);
  if (!venta) throw notFound("Venta no encontrada despues del registro");

  await emitirEventoVenta(currentUser, venta, "VENTA_ENTREGADA");
  return mapVentaDetalle(venta);
};

exports.listarVentas = async (query = {}) => {
  const where = {};
  const q = normalizeText(query.q);

  if (q) {
    where[Op.or] = [
      { numero_factura: { [Op.iLike]: `%${q}%` } },
      { numero_recibo: { [Op.iLike]: `%${q}%` } },
      { "$cliente.nombre$": { [Op.iLike]: `%${q}%` } },
      { "$cliente.identificacion$": { [Op.iLike]: `%${q}%` } },
      { "$lote.nombre$": { [Op.iLike]: `%${q}%` } },
    ];
  }

  if (query.cliente_id) {
    const clienteId = asPositiveInteger(query.cliente_id, "cliente_id");
    where.cliente_id = clienteId;
  }

  if (query.estado) {
    const estado = normalizeText(query.estado, { upper: true });
    if (!Object.values(ESTADOS_VENTA).includes(estado)) {
      throw badRequest("estado invalido");
    }
    where.estado = estado;
  }

  const desde = normalizeDate(query.desde, { fieldName: "desde" });
  const hasta = normalizeDate(query.hasta, { fieldName: "hasta" });

  if (desde && hasta && desde > hasta) {
    throw badRequest("El rango de fechas es invalido");
  }

  if (desde || hasta) {
    where.fecha_entrega = {
      ...(desde ? { [Op.gte]: desde } : {}),
      ...(hasta ? { [Op.lte]: hasta } : {}),
    };
  }

  if (!where.fecha_entrega && query.mes) {
    const mes = String(query.mes).trim();
    if (!/^\d{4}-\d{2}$/.test(mes)) {
      throw badRequest("mes invalido. Usa formato YYYY-MM");
    }

    const [year, month] = mes.split("-").map((x) => Number(x));
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    where.fecha_entrega = {
      [Op.between]: [`${mes}-01`, `${mes}-${String(lastDay).padStart(2, "0")}`],
    };
  }

  const pageRaw = Number(query.page ?? 1);
  const pageSizeRaw = Number(query.pageSize ?? query.limit ?? 20);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.trunc(pageRaw) : 1;
  const pageSize = Number.isFinite(pageSizeRaw) && pageSizeRaw > 0
    ? Math.min(100, Math.trunc(pageSizeRaw))
    : 20;
  const offset = (page - 1) * pageSize;

  const { rows, count } = await models.Venta.findAndCountAll({
    where,
    include: [
      {
        model: models.Cliente,
        as: "cliente",
        attributes: ["id", "nombre", "identificacion"],
      },
      {
        model: models.Lote,
        as: "lote",
        attributes: ["id", "nombre"],
        include: [{ model: models.Finca, as: "finca", attributes: ["id", "nombre"] }],
      },
    ],
    order: [["fecha_entrega", "DESC"], ["id", "DESC"]],
    limit: pageSize,
    offset,
    distinct: true,
  });

  return {
    total: count,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(count / pageSize)),
    data: rows.map(mapVentaLista),
  };
};

exports.obtenerVenta = async (id) => {
  const ventaId = asPositiveInteger(id, "venta_id");

  const venta = await cargarVentaConDetalle(ventaId);
  if (!venta) throw notFound("Venta no encontrada");

  const disponibilidadLote = await calcularDisponibilidadPorLote(Number(venta.lote_id));

  return {
    ...mapVentaDetalle(venta),
    disponibilidad_lote: disponibilidadLote,
  };
};

exports.registrarLiquidacion = async (currentUser, id, payload = {}) => {
  assertPuedeLiquidarOPagar(currentUser, "registrar liquidacion");

  const ventaId = asPositiveInteger(id, "venta_id");
  const numeroRecibo = normalizeText(payload.numero_recibo, { upper: true });
  if (!numeroRecibo) throw badRequest("numero_recibo es obligatorio");

  const gavetasDevueltas = asNonNegativeNumber(payload.gavetas_devueltas, "gavetas_devueltas");
  const gavetasUtiles = asNonNegativeNumber(payload.gavetas_utiles, "gavetas_utiles");
  const fechaLiquidacion =
    normalizeDate(payload.fecha_liquidacion, {
      fieldName: "fecha_liquidacion",
      fallbackToday: true,
    }) || new Date().toISOString().slice(0, 10);

  await sequelize.transaction(async (t) => {
    const venta = await models.Venta.findByPk(ventaId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!venta) throw notFound("Venta no encontrada");
    if (venta.estado !== ESTADOS_VENTA.PENDIENTE) {
      throw conflict("Solo se puede liquidar una venta en estado PENDIENTE");
    }

    const detalles = normalizeLiquidacionDetalle(venta.tipo_venta, payload.detalles);

    const gavetasEntregadas = Number(venta.gavetas_entregadas || 0);
    if (gavetasDevueltas > gavetasEntregadas + 1e-9) {
      throw badRequest("gavetas_devueltas no puede exceder gavetas_entregadas");
    }
    if (gavetasUtiles > gavetasEntregadas + 1e-9) {
      throw badRequest("gavetas_utiles no puede exceder gavetas_entregadas");
    }

    const duplicada = await models.Venta.findOne({
      where: {
        numero_recibo: numeroRecibo,
        id: { [Op.ne]: venta.id },
      },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (duplicada) {
      throw conflict("numero_recibo ya existe en otra venta");
    }

    const subtotal = toMoney(detalles.reduce((acc, d) => acc + Number(d.subtotal), 0));
    const total = subtotal;

    await models.VentaDetalle.destroy({ where: { venta_id: venta.id }, transaction: t });
    await models.VentaDetalle.bulkCreate(
      detalles.map((d) => ({
        venta_id: venta.id,
        clase: d.clase,
        peso_kg: toWeight(d.peso_kg).toFixed(3),
        precio_unitario: Number(d.precio_unitario).toFixed(4),
        subtotal: toMoney(d.subtotal).toFixed(2),
      })),
      { transaction: t }
    );

    const destinoReclasificacion =
      gavetasDevueltas > 0
        ? venta.tipo_venta === TIPOS_VENTA.EXPORTACION
          ? "NACIONAL"
          : "RECHAZO"
        : null;

    venta.numero_recibo = numeroRecibo;
    venta.gavetas_devueltas = toQty(gavetasDevueltas).toFixed(2);
    venta.gavetas_utiles = toQty(gavetasUtiles).toFixed(2);
    venta.subtotal = subtotal.toFixed(2);
    venta.total = total.toFixed(2);
    venta.estado = ESTADOS_VENTA.LIQUIDADA;
    venta.fecha_liquidacion = fechaLiquidacion;
    venta.liquidado_por = currentUser.sub;
    venta.reclasificacion_destino = destinoReclasificacion;
    venta.reclasificacion_gavetas = toQty(gavetasDevueltas).toFixed(2);

    await venta.save({ transaction: t });
  });

  const ventaActualizada = await cargarVentaConDetalle(ventaId);
  if (!ventaActualizada) throw notFound("Venta no encontrada despues de liquidar");

  await emitirEventoVenta(currentUser, ventaActualizada, "VENTA_LIQUIDADA");

  return {
    ...mapVentaDetalle(ventaActualizada),
    disponibilidad_lote: await calcularDisponibilidadPorLote(Number(ventaActualizada.lote_id)),
  };
};

exports.registrarPago = async (currentUser, id, payload = {}) => {
  assertPuedeLiquidarOPagar(currentUser, "registrar pago");

  const ventaId = asPositiveInteger(id, "venta_id");
  const formaPago = normalizeFormaPago(payload.forma_pago);
  const fechaPago = normalizeDate(payload.fecha_pago, {
    fieldName: "fecha_pago",
    fallbackToday: false,
  });
  const observacionPago = normalizeText(payload.observacion);

  await sequelize.transaction(async (t) => {
    const venta = await models.Venta.findByPk(ventaId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!venta) throw notFound("Venta no encontrada");

    if (venta.estado === ESTADOS_VENTA.PENDIENTE) {
      throw conflict("No se puede pagar una venta no liquidada");
    }
    if (venta.estado === ESTADOS_VENTA.PAGADA) {
      throw conflict("La venta ya esta pagada");
    }
    if (venta.estado === ESTADOS_VENTA.CANCELADA) {
      throw conflict("No se puede pagar una venta cancelada");
    }

    venta.forma_pago = formaPago;
    venta.fecha_pago = fechaPago;
    venta.observacion_pago = observacionPago;
    venta.estado = ESTADOS_VENTA.PAGADA;
    venta.pagado_por = currentUser.sub;

    await venta.save({ transaction: t });
  });

  const ventaActualizada = await cargarVentaConDetalle(ventaId);
  if (!ventaActualizada) throw notFound("Venta no encontrada despues de registrar pago");

  await emitirEventoVenta(currentUser, ventaActualizada, "VENTA_PAGADA");

  return {
    ...mapVentaDetalle(ventaActualizada),
    disponibilidad_lote: await calcularDisponibilidadPorLote(Number(ventaActualizada.lote_id)),
  };
};

exports._helpers = {
  normalizarClasificacionCosecha,
  normalizeLiquidacionDetalle,
  calcularDisponibilidadPorLote,
};
