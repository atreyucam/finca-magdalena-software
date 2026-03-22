const { fn, col } = require("sequelize");
const { models } = require("../../../db");
const legacyReportesService = require("../reportes.service");
const ventasReportService = require("../ventas/reportes.ventas.service");
const comprasReportService = require("../compras/reportes.compras.service");
const { Op, buildMeta, resolveGlobalFilters, toYmd } = require("../helpers/global-report-filters");

function toMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function weekKey(dateLike) {
  const date = new Date(`${String(dateLike).slice(0, 10)}T00:00:00Z`);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

exports.reporteAltaDireccion = async (currentUser, query = {}) => {
  const globalFilters = await resolveGlobalFilters(query);

  const [ventas, compras, manoObra, inventario, tareasVencidas, tareasVencidasPorFinca] = await Promise.all([
    ventasReportService.reporteComercialVentas(currentUser, query),
    comprasReportService.reporteAbastecimientoCompras(currentUser, query),
    legacyReportesService.reporteManoObraResumen(currentUser, query),
    legacyReportesService.reporteInventarioResumen(currentUser, query),
    models.Tarea.count({
      where: {
        estado: { [Op.notIn]: ["Verificada", "Cancelada"] },
        fecha_programada: { [Op.lt]: `${toYmd(new Date())} 00:00:00` },
      },
      include: [
        {
          model: models.Lote,
          required: true,
          attributes: [],
          where: { finca_id: { [Op.in]: globalFilters.fincaIds } },
        },
      ],
      distinct: true,
    }),
    models.Tarea.findAll({
      where: {
        estado: { [Op.notIn]: ["Verificada", "Cancelada"] },
        fecha_programada: { [Op.lt]: `${toYmd(new Date())} 00:00:00` },
      },
      include: [
        {
          model: models.Lote,
          required: true,
          attributes: [],
          include: [{ model: models.Finca, as: "finca", attributes: [] }],
          where: { finca_id: { [Op.in]: globalFilters.fincaIds } },
        },
      ],
      attributes: [
        [col("Lote.finca.id"), "finca_id"],
        [col("Lote.finca.nombre"), "finca_nombre"],
        [fn("COUNT", col("Tarea.id")), "total"],
      ],
      group: [col("Lote.finca.id"), col("Lote.finca.nombre")],
      raw: true,
    }),
  ]);

  const ventasTotal = Number(ventas?.kpis?.total_vendido || 0);
  const comprasTotal = Number(compras?.kpis?.monto_total_comprado || 0);
  const nominaTotal = Number(manoObra?.kpis?.monto_total || 0);
  const alertasInventario =
    Number(inventario?.stats?.items_sin_stock || 0) +
    Number(inventario?.stats?.items_bajo_minimo || 0) +
    Number(inventario?.stats?.lotes_por_vencer || 0);

  const evolucionMap = new Map();

  for (const row of ventas?.graficos?.evolucion_por_fecha || []) {
    const key = weekKey(row.fecha);
    const current = evolucionMap.get(key) || { periodo: key, ventas: 0, compras: 0, nomina: 0 };
    current.ventas += Number(row.monto_total || 0);
    evolucionMap.set(key, current);
  }

  for (const row of compras?.graficos?.evolucion_por_fecha || []) {
    const key = weekKey(row.fecha);
    const current = evolucionMap.get(key) || { periodo: key, ventas: 0, compras: 0, nomina: 0 };
    current.compras += Number(row.monto_total || 0);
    evolucionMap.set(key, current);
  }

  for (const row of manoObra?.series_total_por_semana || []) {
    const key = row.semana_iso;
    const current = evolucionMap.get(key) || { periodo: key, ventas: 0, compras: 0, nomina: 0 };
    current.nomina += Number(row.total || 0);
    evolucionMap.set(key, current);
  }

  const vencidasMap = new Map(
    (tareasVencidasPorFinca || []).map((row) => [Number(row.finca_id), Number(row.total || 0)])
  );

  const resumenPorFinca = (ventas?.tablas?.resumen_por_finca || []).map((row) => ({
    finca_id: row.finca_id,
    finca: row.finca,
    ventas_total: Number(row.total_vendido || 0),
    compras_total: null,
    nomina_total: null,
    utilidad_simple: null,
    tareas_vencidas: vencidasMap.get(Number(row.finca_id)) || 0,
    nota: "Compras y nómina aún no tienen trazabilidad confiable por finca en el modelo actual.",
  }));

  return {
    meta: {
      ...buildMeta("alta-direccion", globalFilters),
      limitaciones: [
        "Compras no tiene relación directa con finca en el modelo actual; se consolida a nivel global.",
        "Nómina no tiene trazabilidad multi-finca consistente en todos los registros actuales; se consolida a nivel global.",
        "La utilidad operativa simple es una lectura ejecutiva básica: ventas - compras - nómina.",
      ],
    },
    kpis: {
      ventas_totales_periodo: toMoney(ventasTotal),
      compras_totales_periodo: toMoney(comprasTotal),
      nomina_total_periodo: toMoney(nominaTotal),
      utilidad_operativa_simple: toMoney(ventasTotal - comprasTotal - nominaTotal),
      numero_ventas: Number(ventas?.kpis?.ventas_periodo || 0),
      numero_compras: Number(compras?.kpis?.compras_periodo || 0),
      tareas_vencidas: Number(tareasVencidas || 0),
      alertas_inventario: alertasInventario,
    },
    graficos: {
      comparativo_operativo: [
        { categoria: "Ventas", total: toMoney(ventasTotal) },
        { categoria: "Compras", total: toMoney(comprasTotal) },
        { categoria: "Nomina", total: toMoney(nominaTotal) },
      ],
      distribucion_por_finca: (ventas?.graficos?.ventas_por_finca || []).map((row) => ({
        finca_id: row.finca_id,
        finca: row.finca,
        ventas_total: Number(row.monto_total || 0),
        tareas_vencidas: vencidasMap.get(Number(row.finca_id)) || 0,
      })),
      evolucion_temporal: Array.from(evolucionMap.values())
        .sort((a, b) => String(a.periodo).localeCompare(String(b.periodo)))
        .map((row) => ({
          periodo: row.periodo,
          ventas: toMoney(row.ventas),
          compras: toMoney(row.compras),
          nomina: toMoney(row.nomina),
          utilidad_simple: toMoney(row.ventas - row.compras - row.nomina),
        })),
      utilidad_simple_por_finca: {
        disponible: false,
        motivo: "Compras y nómina aún no son atribuibles por finca de forma confiable en el modelo actual.",
      },
    },
    tablas: {
      resumen_ejecutivo_por_finca: resumenPorFinca,
    },
    rankings: {
      top_fincas_por_ventas: ventas?.rankings?.top_fincas || [],
      top_fincas_por_utilidad_simple: {
        disponible: false,
        motivo: "No hay trazabilidad completa de compras y nómina por finca.",
      },
      top_clientes: ventas?.rankings?.top_clientes || [],
      top_proveedores: compras?.rankings?.top_proveedores || [],
    },
  };
};
