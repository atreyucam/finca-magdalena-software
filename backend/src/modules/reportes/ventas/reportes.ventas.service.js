const { models } = require("../../../db");
const {
  Op,
  average,
  buildDateFilter,
  buildMeta,
  dayDiff,
  resolveGlobalFilters,
  sum,
} = require("../helpers/global-report-filters");

function toMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function paginateRows(rows, pageRaw, pageSizeRaw) {
  const page = Number.isFinite(Number(pageRaw)) && Number(pageRaw) > 0 ? Math.floor(Number(pageRaw)) : 1;
  const pageSize =
    Number.isFinite(Number(pageSizeRaw)) && Number(pageSizeRaw) > 0
      ? Math.min(100, Math.floor(Number(pageSizeRaw)))
      : 20;

  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;

  return {
    page,
    pageSize,
    total,
    totalPages,
    rows: rows.slice(start, start + pageSize),
  };
}

exports.reporteComercialVentas = async (_currentUser, query = {}) => {
  const globalFilters = await resolveGlobalFilters(query);
  const where = {
    ...buildDateFilter("fecha_entrega", globalFilters.desde, globalFilters.hasta),
  };

  const ventas = await models.Venta.findAll({
    where,
    include: [
      { model: models.Cliente, as: "cliente", attributes: ["id", "nombre", "identificacion"] },
      {
        model: models.Lote,
        as: "lote",
        required: true,
        attributes: ["id", "nombre", "finca_id"],
        where: { finca_id: { [Op.in]: globalFilters.fincaIds } },
        include: [{ model: models.Finca, as: "finca", attributes: ["id", "nombre"] }],
      },
      { model: models.VentaDetalle, as: "detalles", attributes: ["id", "clase", "peso_kg", "precio_unitario", "subtotal"] },
    ],
    order: [["fecha_entrega", "DESC"], ["id", "DESC"]],
  });

  const rows = ventas.map((venta) => {
    const raw = venta.toJSON();
    const detailRows = Array.isArray(raw.detalles) ? raw.detalles : [];
    const kgTotal = sum(detailRows.map((detail) => detail.peso_kg));

    return {
      id: Number(raw.id),
      numero_factura: raw.numero_factura,
      numero_recibo: raw.numero_recibo || null,
      fecha_entrega: raw.fecha_entrega,
      fecha_liquidacion: raw.fecha_liquidacion || null,
      fecha_pago: raw.fecha_pago || null,
      estado: raw.estado,
      tipo_venta: raw.tipo_venta,
      cliente: raw.cliente
        ? {
            id: Number(raw.cliente.id),
            nombre: raw.cliente.nombre,
            identificacion: raw.cliente.identificacion,
          }
        : null,
      lote: raw.lote
        ? {
            id: Number(raw.lote.id),
            nombre: raw.lote.nombre,
            finca_id: Number(raw.lote.finca_id),
            finca_nombre: raw.lote.finca?.nombre || null,
          }
        : null,
      gavetas_entregadas: Number(raw.gavetas_entregadas || 0),
      gavetas_devueltas: Number(raw.gavetas_devueltas || 0),
      gavetas_utiles: Number(raw.gavetas_utiles || 0),
      subtotal: toMoney(raw.subtotal),
      total: toMoney(raw.total),
      forma_pago: raw.forma_pago || null,
      kg_total: Number(kgTotal.toFixed(3)),
      detalles: detailRows.map((detail) => ({
        id: Number(detail.id),
        clase: detail.clase,
        peso_kg: Number(detail.peso_kg || 0),
        precio_unitario: Number(detail.precio_unitario || 0),
        subtotal: toMoney(detail.subtotal),
      })),
    };
  });

  const byEstado = new Map();
  const byTipo = new Map();
  const byFinca = new Map();
  const byCliente = new Map();
  const byLote = new Map();
  const timeline = new Map();

  const cycleEntregaLiquidacion = [];
  const cycleLiquidacionPago = [];
  const cycleEntregaPago = [];

  for (const row of rows) {
    byEstado.set(row.estado, (byEstado.get(row.estado) || 0) + 1);
    byTipo.set(row.tipo_venta, (byTipo.get(row.tipo_venta) || 0) + 1);

    const fincaKey = String(row.lote?.finca_id || "0");
    const fincaRow = byFinca.get(fincaKey) || {
      finca_id: row.lote?.finca_id || null,
      finca: row.lote?.finca_nombre || "Sin finca",
      total_ventas: 0,
      monto_total: 0,
      kg_total: 0,
    };
    fincaRow.total_ventas += 1;
    fincaRow.monto_total += row.total;
    fincaRow.kg_total += row.kg_total;
    byFinca.set(fincaKey, fincaRow);

    const clienteKey = String(row.cliente?.id || "0");
    const clienteRow = byCliente.get(clienteKey) || {
      cliente_id: row.cliente?.id || null,
      cliente: row.cliente?.nombre || "Sin cliente",
      ventas: 0,
      monto_total: 0,
      kg_total: 0,
    };
    clienteRow.ventas += 1;
    clienteRow.monto_total += row.total;
    clienteRow.kg_total += row.kg_total;
    byCliente.set(clienteKey, clienteRow);

    const loteKey = String(row.lote?.id || "0");
    const loteRow = byLote.get(loteKey) || {
      lote_id: row.lote?.id || null,
      lote: row.lote?.nombre || "Sin lote",
      finca: row.lote?.finca_nombre || null,
      ventas: 0,
      monto_total: 0,
      kg_total: 0,
    };
    loteRow.ventas += 1;
    loteRow.monto_total += row.total;
    loteRow.kg_total += row.kg_total;
    byLote.set(loteKey, loteRow);

    const timelineRow = timeline.get(row.fecha_entrega) || {
      fecha: row.fecha_entrega,
      total_ventas: 0,
      monto_total: 0,
    };
    timelineRow.total_ventas += 1;
    timelineRow.monto_total += row.total;
    timeline.set(row.fecha_entrega, timelineRow);

    const entregaLiquidacion = dayDiff(row.fecha_entrega, row.fecha_liquidacion);
    const liquidacionPago = dayDiff(row.fecha_liquidacion, row.fecha_pago);
    const entregaPago = dayDiff(row.fecha_entrega, row.fecha_pago);

    if (entregaLiquidacion !== null) cycleEntregaLiquidacion.push(entregaLiquidacion);
    if (liquidacionPago !== null) cycleLiquidacionPago.push(liquidacionPago);
    if (entregaPago !== null) cycleEntregaPago.push(entregaPago);
  }

  const rowsWithAmount = rows.filter((row) => Number(row.total || 0) > 0);
  const totalVendido = sum(rows.map((row) => row.total));
  const paginatedVentas = paginateRows(rows, query.page, query.pageSize || query.limit);

  return {
    meta: {
      ...buildMeta("comercial-ventas", globalFilters),
      limitaciones: [],
    },
    kpis: {
      ventas_periodo: rows.length,
      total_vendido: toMoney(totalVendido),
      ventas_pendientes_liquidar: rows.filter((row) => row.estado === "PENDIENTE").length,
      ventas_liquidadas_pendientes_pago: rows.filter((row) => row.estado === "LIQUIDADA").length,
      ventas_pagadas: rows.filter((row) => row.estado === "PAGADA").length,
      ticket_promedio: toMoney(rowsWithAmount.length ? totalVendido / rowsWithAmount.length : 0),
      clientes_unicos: new Set(rows.map((row) => row.cliente?.id).filter(Boolean)).size,
    },
    graficos: {
      ventas_por_estado: Array.from(byEstado.entries()).map(([estado, total]) => ({ estado, total })),
      ventas_por_finca: Array.from(byFinca.values())
        .sort((a, b) => b.monto_total - a.monto_total)
        .map((row) => ({
          finca_id: row.finca_id,
          finca: row.finca,
          total_ventas: row.total_ventas,
          monto_total: toMoney(row.monto_total),
          kg_total: Number(row.kg_total.toFixed(3)),
        })),
      ventas_por_tipo: Array.from(byTipo.entries()).map(([tipo, total]) => ({ tipo, total })),
      evolucion_por_fecha: Array.from(timeline.values())
        .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)))
        .map((row) => ({
          fecha: row.fecha,
          total_ventas: row.total_ventas,
          monto_total: toMoney(row.monto_total),
        })),
    },
    tablas: {
      ventas: {
        page: paginatedVentas.page,
        pageSize: paginatedVentas.pageSize,
        total: paginatedVentas.total,
        totalPages: paginatedVentas.totalPages,
        rows: paginatedVentas.rows,
      },
      resumen_por_finca: Array.from(byFinca.values())
        .sort((a, b) => b.monto_total - a.monto_total)
        .map((row) => ({
          finca_id: row.finca_id,
          finca: row.finca,
          ventas: row.total_ventas,
          total_vendido: toMoney(row.monto_total),
          kg_total: Number(row.kg_total.toFixed(3)),
        })),
    },
    rankings: {
      top_clientes: Array.from(byCliente.values())
        .sort((a, b) => b.monto_total - a.monto_total)
        .slice(0, 10)
        .map((row) => ({
          cliente_id: row.cliente_id,
          cliente: row.cliente,
          ventas: row.ventas,
          monto_total: toMoney(row.monto_total),
          kg_total: Number(row.kg_total.toFixed(3)),
        })),
      top_lotes_por_monto: Array.from(byLote.values())
        .sort((a, b) => b.monto_total - a.monto_total)
        .slice(0, 10)
        .map((row) => ({
          lote_id: row.lote_id,
          lote: row.lote,
          finca: row.finca,
          ventas: row.ventas,
          monto_total: toMoney(row.monto_total),
          kg_total: Number(row.kg_total.toFixed(3)),
        })),
      top_lotes_por_kg: Array.from(byLote.values())
        .sort((a, b) => b.kg_total - a.kg_total)
        .slice(0, 10)
        .map((row) => ({
          lote_id: row.lote_id,
          lote: row.lote,
          finca: row.finca,
          ventas: row.ventas,
          monto_total: toMoney(row.monto_total),
          kg_total: Number(row.kg_total.toFixed(3)),
        })),
      top_fincas: Array.from(byFinca.values())
        .sort((a, b) => b.monto_total - a.monto_total)
        .slice(0, 10)
        .map((row) => ({
          finca_id: row.finca_id,
          finca: row.finca,
          ventas: row.total_ventas,
          monto_total: toMoney(row.monto_total),
          kg_total: Number(row.kg_total.toFixed(3)),
        })),
    },
    extras: {
      metricas_ciclo: {
        entrega_a_liquidacion_dias_promedio: Number(average(cycleEntregaLiquidacion).toFixed(2)),
        liquidacion_a_pago_dias_promedio: Number(average(cycleLiquidacionPago).toFixed(2)),
        entrega_a_pago_dias_promedio: Number(average(cycleEntregaPago).toFixed(2)),
      },
    },
  };
};
