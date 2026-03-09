const { Op } = require("sequelize");
const { models, sequelize } = require("../../db");
const inventarioService = require("../inventario/inventario.service");
const notificacionesService = require("../notificaciones/notificaciones.service");

function badRequest(message = "Solicitud invalida") {
  const e = new Error(message);
  e.status = 400;
  e.code = "BAD_REQUEST";
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

function toPositiveNumber(value, fieldName) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    throw badRequest(`${fieldName} debe ser mayor a 0`);
  }
  return n;
}

function toMoney(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function toQty(n) {
  return Math.round((Number(n) + Number.EPSILON) * 1000) / 1000;
}

function normalizeDate(value) {
  if (!value) return new Date().toISOString().slice(0, 10);
  const raw = String(value).trim();
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) throw badRequest("fecha_compra invalida");
  return d.toISOString().slice(0, 10);
}

function normalizeDetalle(detallesRaw) {
  if (!Array.isArray(detallesRaw) || detallesRaw.length === 0) {
    throw badRequest("La compra debe tener al menos un item");
  }

  const details = detallesRaw.map((row, idx) => {
    const itemId = Number(row?.inventario_item_id ?? row?.item_id);
    if (!Number.isInteger(itemId) || itemId <= 0) {
      throw badRequest(`Item invalido en la fila ${idx + 1}`);
    }

    const cantidad = toPositiveNumber(row?.cantidad, `cantidad (fila ${idx + 1})`);
    const costoUnitario = toPositiveNumber(row?.costo_unitario, `costo_unitario (fila ${idx + 1})`);
    const subtotal = toMoney(cantidad * costoUnitario);

    return {
      inventario_item_id: itemId,
      cantidad: toQty(cantidad),
      costo_unitario: costoUnitario,
      subtotal,
    };
  });

  const ids = details.map((d) => d.inventario_item_id);
  const idsUnicos = new Set(ids);
  if (idsUnicos.size !== ids.length) {
    throw badRequest("No se permite repetir items dentro de la misma compra");
  }

  return details;
}

function mapCompraLista(compra) {
  return {
    id: compra.id,
    numero_factura: compra.numero_factura,
    fecha_compra: compra.fecha_compra,
    proveedor: compra.proveedor
      ? {
          id: compra.proveedor.id,
          nombre: compra.proveedor.nombre,
          ruc: compra.proveedor.ruc,
        }
      : null,
    subtotal: compra.subtotal,
    total: compra.total,
    estado: compra.estado,
    creado_por: compra.creador
      ? {
          id: compra.creador.id,
          nombre: `${compra.creador.nombres || ""} ${compra.creador.apellidos || ""}`.trim(),
        }
      : null,
    created_at: compra.created_at,
    updated_at: compra.updated_at,
  };
}

function mapCompraDetalle(compra) {
  return {
    ...mapCompraLista(compra),
    observacion: compra.observacion,
    detalles: (compra.detalles || []).map((d) => ({
      id: d.id,
      inventario_item_id: d.inventario_item_id,
      item: d.item
        ? {
            id: d.item.id,
            nombre: d.item.nombre,
            categoria: d.item.categoria,
            unidad: d.item.Unidad
              ? {
                  id: d.item.Unidad.id,
                  codigo: d.item.Unidad.codigo,
                  nombre: d.item.Unidad.nombre,
                }
              : null,
          }
        : null,
      cantidad: d.cantidad,
      costo_unitario: d.costo_unitario,
      subtotal: d.subtotal,
    })),
  };
}

async function cargarCompraConDetalle(compraId) {
  return models.Compra.findByPk(compraId, {
    include: [
      {
        model: models.Proveedor,
        as: "proveedor",
        attributes: ["id", "nombre", "ruc", "telefono", "correo", "direccion", "activo"],
      },
      {
        model: models.Usuario,
        as: "creador",
        attributes: ["id", "nombres", "apellidos"],
      },
      {
        model: models.CompraDetalle,
        as: "detalles",
        include: [
          {
            model: models.InventarioItem,
            as: "item",
            attributes: ["id", "nombre", "categoria", "unidad_id"],
            include: [{ model: models.Unidad, attributes: ["id", "codigo", "nombre"] }],
          },
        ],
      },
    ],
    order: [[{ model: models.CompraDetalle, as: "detalles" }, "id", "ASC"]],
  });
}

exports.crearCompra = async (currentUser, payload = {}) => {
  if (currentUser?.role !== "Propietario") {
    const e = new Error("Solo Propietario puede registrar compras");
    e.status = 403;
    e.code = "FORBIDDEN";
    throw e;
  }

  const numeroFactura = normalizeText(payload.numero_factura, { upper: true });
  if (!numeroFactura) throw badRequest("numero_factura es obligatorio");

  const proveedorId = Number(payload.proveedor_id);
  if (!Number.isInteger(proveedorId) || proveedorId <= 0) {
    throw badRequest("proveedor_id es obligatorio");
  }

  const fechaCompra = normalizeDate(payload.fecha_compra);
  const observacion = normalizeText(payload.observacion);
  const detalles = normalizeDetalle(payload.detalles);

  const itemIds = detalles.map((d) => d.inventario_item_id);
  const subtotal = toMoney(detalles.reduce((acc, d) => acc + d.subtotal, 0));
  const total = subtotal;

  let compraCreadaId = null;

  try {
    await sequelize.transaction(async (t) => {
      const [compraDuplicada, proveedor, rowsItems] = await Promise.all([
        models.Compra.findOne({
          where: { numero_factura: numeroFactura },
          transaction: t,
          lock: t.LOCK.UPDATE,
        }),
        models.Proveedor.findOne({
          where: { id: proveedorId, activo: true },
          transaction: t,
          lock: t.LOCK.UPDATE,
        }),
        models.InventarioItem.findAll({
          where: { id: itemIds },
          transaction: t,
          lock: t.LOCK.UPDATE,
        }),
      ]);

      if (compraDuplicada) {
        throw conflict("numero_factura ya existe");
      }

      if (!proveedor) {
        throw badRequest("Proveedor no encontrado o inactivo");
      }

      const mapItems = new Map(rowsItems.map((it) => [Number(it.id), it]));
      const faltantes = itemIds.filter((id) => !mapItems.has(Number(id)));
      if (faltantes.length) {
        throw badRequest(`Item(s) de inventario no encontrado(s): ${faltantes.join(", ")}`);
      }

      const compra = await models.Compra.create(
        {
          numero_factura: numeroFactura,
          proveedor_id: proveedorId,
          fecha_compra: fechaCompra,
          observacion,
          subtotal: subtotal.toFixed(2),
          total: total.toFixed(2),
          estado: "CONFIRMADA",
          creado_por: currentUser.sub,
        },
        { transaction: t }
      );

      compraCreadaId = Number(compra.id);

      await models.CompraDetalle.bulkCreate(
        detalles.map((d) => ({
          compra_id: compra.id,
          inventario_item_id: d.inventario_item_id,
          cantidad: d.cantidad.toFixed(3),
          costo_unitario: Number(d.costo_unitario).toFixed(4),
          subtotal: d.subtotal.toFixed(2),
        })),
        { transaction: t }
      );

      for (const d of detalles) {
        const item = mapItems.get(Number(d.inventario_item_id));
        await inventarioService._moverStock({
          t,
          item,
          tipo: "ENTRADA_COMPRA",
          cantidad: d.cantidad,
          unidad_id: item.unidad_id,
          motivo: `Compra ${numeroFactura}`,
          referencia: {
            referencia_tipo: "COMPRA",
            referencia_id: compra.id,
            compra_id: compra.id,
            numero_factura: numeroFactura,
            tipo_evento: "COMPRA_REGISTRADA",
            usuario_id: currentUser.sub,
          },
        });
      }
    });
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      throw conflict("numero_factura ya existe");
    }
    throw error;
  }

  if (!compraCreadaId) throw badRequest("No se pudo registrar la compra");

  const totalMsg = Number(total).toFixed(2);
  try {
    await notificacionesService.crearParaRoles(["Propietario", "Tecnico"], {
      tipo: "Inventario",
      titulo: "Compra registrada",
      mensaje: `Se registro la compra ${numeroFactura} por $${totalMsg}.`,
      referencia: {
        tipo_evento: "COMPRA_REGISTRADA",
        compra_id: compraCreadaId,
        numero_factura: numeroFactura,
      },
      prioridad: "Info",
      dedupe: {
        windowMs: 5 * 60 * 1000,
        includeMessage: true,
        match: {
          tipo_evento: "COMPRA_REGISTRADA",
          compra_id: compraCreadaId,
        },
      },
    });
  } catch (error) {
    // La compra queda registrada aunque falle la notificacion.
    console.error("No se pudo emitir notificacion de compra:", error?.message || error);
  }

  const compra = await cargarCompraConDetalle(compraCreadaId);
  if (!compra) throw notFound("Compra no encontrada despues del registro");
  return mapCompraDetalle(compra);
};

exports.listarCompras = async (query = {}) => {
  const where = {};
  const q = normalizeText(query.q);

  if (q) {
    where[Op.or] = [
      { numero_factura: { [Op.iLike]: `%${q}%` } },
      { "$proveedor.nombre$": { [Op.iLike]: `%${q}%` } },
      { "$proveedor.ruc$": { [Op.iLike]: `%${q}%` } },
    ];
  }

  if (query.proveedor_id) {
    const proveedorId = Number(query.proveedor_id);
    if (!Number.isInteger(proveedorId) || proveedorId <= 0) {
      throw badRequest("proveedor_id invalido");
    }
    where.proveedor_id = proveedorId;
  }

  const desde = normalizeText(query.desde);
  const hasta = normalizeText(query.hasta);
  if (desde && hasta) {
    where.fecha_compra = { [Op.between]: [desde, hasta] };
  } else if (desde) {
    where.fecha_compra = { [Op.gte]: desde };
  } else if (hasta) {
    where.fecha_compra = { [Op.lte]: hasta };
  }

  const pageRaw = Number(query.page ?? 1);
  const pageSizeRaw = Number(query.pageSize ?? query.limit ?? 20);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.trunc(pageRaw) : 1;
  const pageSize = Number.isFinite(pageSizeRaw) && pageSizeRaw > 0
    ? Math.min(100, Math.trunc(pageSizeRaw))
    : 20;
  const offset = (page - 1) * pageSize;

  const { rows, count } = await models.Compra.findAndCountAll({
    where,
    include: [
      {
        model: models.Proveedor,
        as: "proveedor",
        attributes: ["id", "nombre", "ruc"],
      },
      {
        model: models.Usuario,
        as: "creador",
        attributes: ["id", "nombres", "apellidos"],
      },
    ],
    order: [["created_at", "DESC"], ["id", "DESC"]],
    limit: pageSize,
    offset,
    distinct: true,
  });

  return {
    total: count,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(count / pageSize)),
    data: rows.map(mapCompraLista),
  };
};

exports.obtenerCompra = async (id) => {
  const compraId = Number(id);
  if (!Number.isInteger(compraId) || compraId <= 0) throw badRequest("ID de compra invalido");

  const compra = await cargarCompraConDetalle(compraId);
  if (!compra) throw notFound("Compra no encontrada");

  return mapCompraDetalle(compra);
};
