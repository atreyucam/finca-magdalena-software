const { models } = require("../../../db");
const { buildDateFilter, buildMeta, resolveGlobalFilters, sum } = require("../helpers/global-report-filters");

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

exports.reporteAbastecimientoCompras = async (_currentUser, query = {}) => {
  const globalFilters = await resolveGlobalFilters(query);
  const where = {
    ...buildDateFilter("fecha_compra", globalFilters.desde, globalFilters.hasta),
  };

  const [compras, proveedoresActivos] = await Promise.all([
    models.Compra.findAll({
      where,
      include: [
        { model: models.Proveedor, as: "proveedor", attributes: ["id", "nombre", "ruc"] },
        { model: models.Usuario, as: "creador", attributes: ["id", "nombres", "apellidos"] },
        {
          model: models.CompraDetalle,
          as: "detalles",
          attributes: ["id", "inventario_item_id", "cantidad", "costo_unitario", "subtotal"],
          include: [{ model: models.InventarioItem, as: "item", attributes: ["id", "nombre", "categoria"] }],
        },
      ],
      order: [["fecha_compra", "DESC"], ["id", "DESC"]],
    }),
    models.Proveedor.count({ where: { activo: true } }),
  ]);

  const rows = compras.map((compra) => {
    const raw = compra.toJSON();
    return {
      id: Number(raw.id),
      numero_factura: raw.numero_factura,
      fecha_compra: raw.fecha_compra,
      subtotal: toMoney(raw.subtotal),
      total: toMoney(raw.total),
      estado: raw.estado,
      proveedor: raw.proveedor
        ? {
            id: Number(raw.proveedor.id),
            nombre: raw.proveedor.nombre,
            ruc: raw.proveedor.ruc,
          }
        : null,
      creador: raw.creador
        ? {
            id: Number(raw.creador.id),
            nombre: `${raw.creador.nombres} ${raw.creador.apellidos}`.trim(),
          }
        : null,
      detalles: (raw.detalles || []).map((detalle) => ({
        id: Number(detalle.id),
        item_id: detalle.item ? Number(detalle.item.id) : Number(detalle.inventario_item_id),
        item: detalle.item?.nombre || "Sin item",
        categoria: detalle.item?.categoria || null,
        cantidad: Number(detalle.cantidad || 0),
        costo_unitario: Number(detalle.costo_unitario || 0),
        subtotal: toMoney(detalle.subtotal),
      })),
    };
  });

  const byProveedor = new Map();
  const byCategoria = new Map();
  const byItem = new Map();
  const timeline = new Map();

  for (const row of rows) {
    const proveedorKey = String(row.proveedor?.id || "0");
    const proveedorRow = byProveedor.get(proveedorKey) || {
      proveedor_id: row.proveedor?.id || null,
      proveedor: row.proveedor?.nombre || "Sin proveedor",
      compras: 0,
      monto_total: 0,
    };
    proveedorRow.compras += 1;
    proveedorRow.monto_total += row.total;
    byProveedor.set(proveedorKey, proveedorRow);

    const timelineRow = timeline.get(row.fecha_compra) || {
      fecha: row.fecha_compra,
      compras: 0,
      monto_total: 0,
    };
    timelineRow.compras += 1;
    timelineRow.monto_total += row.total;
    timeline.set(row.fecha_compra, timelineRow);

    for (const detail of row.detalles) {
      const categoriaKey = detail.categoria || "Sin categoría";
      const categoriaRow = byCategoria.get(categoriaKey) || {
        categoria: categoriaKey,
        monto_total: 0,
      };
      categoriaRow.monto_total += detail.subtotal;
      byCategoria.set(categoriaKey, categoriaRow);

      const itemKey = String(detail.item_id || detail.item);
      const itemRow = byItem.get(itemKey) || {
        item_id: detail.item_id || null,
        item: detail.item,
        categoria: detail.categoria,
        cantidad_total: 0,
        monto_total: 0,
        compras: 0,
        costo_sum: 0,
        costo_count: 0,
        ultimo_costo_unitario: 0,
        ultima_fecha_compra: row.fecha_compra,
      };

      itemRow.cantidad_total += detail.cantidad;
      itemRow.monto_total += detail.subtotal;
      itemRow.compras += 1;
      itemRow.costo_sum += detail.costo_unitario;
      itemRow.costo_count += 1;

      if (!itemRow.ultima_fecha_compra || String(itemRow.ultima_fecha_compra) <= String(row.fecha_compra)) {
        itemRow.ultima_fecha_compra = row.fecha_compra;
        itemRow.ultimo_costo_unitario = detail.costo_unitario;
      }

      byItem.set(itemKey, itemRow);
    }
  }

  const variacionCostos = Array.from(byItem.values())
    .map((item) => {
      const costoPromedio = item.costo_count ? item.costo_sum / item.costo_count : 0;
      const delta = costoPromedio ? ((item.ultimo_costo_unitario - costoPromedio) / costoPromedio) * 100 : 0;

      return {
        item_id: item.item_id,
        item: item.item,
        categoria: item.categoria,
        costo_promedio_unitario: Number(costoPromedio.toFixed(4)),
        ultimo_costo_unitario: Number(Number(item.ultimo_costo_unitario || 0).toFixed(4)),
        variacion_pct: Number(delta.toFixed(2)),
        ultima_fecha_compra: item.ultima_fecha_compra,
      };
    })
    .sort((a, b) => Math.abs(Number(b.variacion_pct || 0)) - Math.abs(Number(a.variacion_pct || 0)));

  const paginatedCompras = paginateRows(rows, query.page, query.pageSize || query.limit);

  return {
    meta: {
      ...buildMeta("abastecimiento-compras", globalFilters, { finca_filter_mode: "global-only" }),
      limitaciones: [
        "El dominio actual de compras no tiene relacion directa con finca. El filtro por finca se conserva por consistencia de interfaz, pero este reporte se calcula a nivel global.",
      ],
    },
    kpis: {
      compras_periodo: rows.length,
      monto_total_comprado: toMoney(sum(rows.map((row) => row.total))),
      ticket_promedio: toMoney(rows.length ? sum(rows.map((row) => row.total)) / rows.length : 0),
      proveedores_activos: Number(proveedoresActivos || 0),
      facturas_registradas: rows.length,
    },
    graficos: {
      compras_por_finca: {
        disponible: false,
        motivo: "Compras no guarda finca directa en el modelo actual.",
      },
      compras_por_proveedor: Array.from(byProveedor.values())
        .sort((a, b) => b.monto_total - a.monto_total)
        .map((row) => ({
          proveedor_id: row.proveedor_id,
          proveedor: row.proveedor,
          compras: row.compras,
          monto_total: toMoney(row.monto_total),
        })),
      evolucion_por_fecha: Array.from(timeline.values())
        .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)))
        .map((row) => ({
          fecha: row.fecha,
          compras: row.compras,
          monto_total: toMoney(row.monto_total),
        })),
      monto_por_categoria: Array.from(byCategoria.values())
        .sort((a, b) => b.monto_total - a.monto_total)
        .map((row) => ({
          categoria: row.categoria,
          monto_total: toMoney(row.monto_total),
        })),
    },
    tablas: {
      compras: {
        page: paginatedCompras.page,
        pageSize: paginatedCompras.pageSize,
        total: paginatedCompras.total,
        totalPages: paginatedCompras.totalPages,
        rows: paginatedCompras.rows,
      },
      variacion_costos: variacionCostos.slice(0, 25),
    },
    rankings: {
      top_proveedores: Array.from(byProveedor.values())
        .sort((a, b) => b.monto_total - a.monto_total)
        .slice(0, 10)
        .map((row) => ({
          proveedor_id: row.proveedor_id,
          proveedor: row.proveedor,
          compras: row.compras,
          monto_total: toMoney(row.monto_total),
        })),
      top_items_por_monto: Array.from(byItem.values())
        .sort((a, b) => b.monto_total - a.monto_total)
        .slice(0, 10)
        .map((row) => ({
          item_id: row.item_id,
          item: row.item,
          categoria: row.categoria,
          cantidad_total: Number(row.cantidad_total.toFixed(3)),
          monto_total: toMoney(row.monto_total),
        })),
      top_items_por_cantidad: Array.from(byItem.values())
        .sort((a, b) => b.cantidad_total - a.cantidad_total)
        .slice(0, 10)
        .map((row) => ({
          item_id: row.item_id,
          item: row.item,
          categoria: row.categoria,
          cantidad_total: Number(row.cantidad_total.toFixed(3)),
          monto_total: toMoney(row.monto_total),
        })),
    },
  };
};
