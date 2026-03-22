const { Op } = require("sequelize");

jest.mock("../../db", () => ({
  models: {
    Finca: { findAll: jest.fn() },
    Venta: { findAll: jest.fn() },
    Cliente: {},
    Lote: {},
    VentaDetalle: {},
    Compra: { findAll: jest.fn() },
    CompraDetalle: {},
    Proveedor: { count: jest.fn() },
    Usuario: {},
    InventarioItem: {},
    Tarea: { count: jest.fn(), findAll: jest.fn() },
  },
}));

jest.mock("../../modules/reportes/reportes.service", () => ({
  reporteManoObraResumen: jest.fn(),
  reporteInventarioResumen: jest.fn(),
}));

jest.mock("../../modules/reportes/ventas/reportes.ventas.service", () => ({
  ...jest.requireActual("../../modules/reportes/ventas/reportes.ventas.service"),
  reporteComercialVentas: jest.fn(),
}));

jest.mock("../../modules/reportes/compras/reportes.compras.service", () => ({
  ...jest.requireActual("../../modules/reportes/compras/reportes.compras.service"),
  reporteAbastecimientoCompras: jest.fn(),
}));

const { models } = require("../../db");
const globalFilters = require("../../modules/reportes/helpers/global-report-filters");
const ventasActualService = jest.requireActual("../../modules/reportes/ventas/reportes.ventas.service");
const comprasActualService = jest.requireActual("../../modules/reportes/compras/reportes.compras.service");
const ventasReportService = require("../../modules/reportes/ventas/reportes.ventas.service");
const comprasReportService = require("../../modules/reportes/compras/reportes.compras.service");
const legacyReportesService = require("../../modules/reportes/reportes.service");
const altaDireccionService = require("../../modules/reportes/altaDireccion/reportes.alta-direccion.service");

function jsonRow(payload) {
  return { toJSON: () => payload };
}

describe("reportes fase 1 - helpers y services", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    const fincas = [
      { id: 1, nombre: "Finca Norte", estado: "Activo" },
      { id: 2, nombre: "Finca Sur", estado: "Activo" },
      { id: 3, nombre: "Finca Inactiva", estado: "Inactivo" },
    ];

    models.Finca.findAll.mockImplementation(async ({ where } = {}) => {
      if (where?.id?.[Op.in]) {
        return fincas.filter((finca) => where.id[Op.in].includes(finca.id));
      }
      if (where?.estado) {
        return fincas.filter((finca) => finca.estado === where.estado);
      }
      return fincas;
    });
  });

  test("resolveGlobalFilters usa todas las fincas activas y rango por defecto", async () => {
    const out = await globalFilters.resolveGlobalFilters({});

    expect(out.fincaIds).toEqual([1, 2]);
    expect(out.fincas).toEqual([
      { id: 1, nombre: "Finca Norte", estado: "Activo" },
      { id: 2, nombre: "Finca Sur", estado: "Activo" },
    ]);
    expect(out.rangeInfo.default_ultimos_30_dias).toBe(true);
    expect(out.desde).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(out.hasta).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("resolveGlobalFilters rechaza cuando no hay fincas válidas", async () => {
    models.Finca.findAll.mockResolvedValueOnce([]);

    await expect(
      globalFilters.resolveGlobalFilters({ finca_ids: "999" })
    ).rejects.toMatchObject({ status: 400, message: "No hay fincas disponibles para el reporte." });
  });

  test("reporteComercialVentas calcula KPIs, rankings, paginación y métricas de ciclo", async () => {
    models.Venta.findAll.mockResolvedValue([
      jsonRow({
        id: 101,
        numero_factura: "VTA-101",
        numero_recibo: null,
        fecha_entrega: "2026-03-02",
        fecha_liquidacion: null,
        fecha_pago: null,
        estado: "PENDIENTE",
        tipo_venta: "EXPORTACION",
        gavetas_entregadas: "8",
        gavetas_devueltas: "0",
        gavetas_utiles: "0",
        subtotal: "0",
        total: "0",
        forma_pago: null,
        cliente: { id: 10, nombre: "Cliente Uno", identificacion: "0999" },
        lote: { id: 1, nombre: "Lote A", finca_id: 1, finca: { id: 1, nombre: "Finca Norte" } },
        detalles: [],
      }),
      jsonRow({
        id: 102,
        numero_factura: "VTA-102",
        numero_recibo: "REC-102",
        fecha_entrega: "2026-03-03",
        fecha_liquidacion: "2026-03-05",
        fecha_pago: null,
        estado: "LIQUIDADA",
        tipo_venta: "NACIONAL",
        gavetas_entregadas: "10",
        gavetas_devueltas: "1",
        gavetas_utiles: "9",
        subtotal: "100",
        total: "100",
        forma_pago: null,
        cliente: { id: 10, nombre: "Cliente Uno", identificacion: "0999" },
        lote: { id: 1, nombre: "Lote A", finca_id: 1, finca: { id: 1, nombre: "Finca Norte" } },
        detalles: [
          { id: 1, clase: "primera", peso_kg: "10", precio_unitario: "5", subtotal: "50" },
          { id: 2, clase: "segunda", peso_kg: "10", precio_unitario: "5", subtotal: "50" },
        ],
      }),
      jsonRow({
        id: 103,
        numero_factura: "VTA-103",
        numero_recibo: "REC-103",
        fecha_entrega: "2026-03-04",
        fecha_liquidacion: "2026-03-07",
        fecha_pago: "2026-03-08",
        estado: "PAGADA",
        tipo_venta: "EXPORTACION",
        gavetas_entregadas: "12",
        gavetas_devueltas: "2",
        gavetas_utiles: "10",
        subtotal: "150",
        total: "150",
        forma_pago: "TRANSFERENCIA",
        cliente: { id: 11, nombre: "Cliente Dos", identificacion: "0888" },
        lote: { id: 2, nombre: "Lote B", finca_id: 2, finca: { id: 2, nombre: "Finca Sur" } },
        detalles: [
          { id: 3, clase: "primera", peso_kg: "15", precio_unitario: "10", subtotal: "150" },
        ],
      }),
    ]);

    const out = await ventasActualService.reporteComercialVentas(
      { sub: 1, role: "Tecnico" },
      { finca_ids: "1,2", desde: "2026-03-01", hasta: "2026-03-31", page: 1, pageSize: 2 }
    );

    expect(models.Venta.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          fecha_entrega: { [Op.between]: ["2026-03-01", "2026-03-31"] },
        },
      })
    );
    expect(models.Venta.findAll.mock.calls[0][0].include[1].where).toEqual({
      finca_id: { [Op.in]: [1, 2] },
    });

    expect(out.kpis).toMatchObject({
      ventas_periodo: 3,
      total_vendido: 250,
      ventas_pendientes_liquidar: 1,
      ventas_liquidadas_pendientes_pago: 1,
      ventas_pagadas: 1,
      ticket_promedio: 125,
      clientes_unicos: 2,
    });
    expect(out.tablas.ventas).toMatchObject({
      page: 1,
      pageSize: 2,
      total: 3,
      totalPages: 2,
    });
    expect(out.graficos.ventas_por_finca[0]).toMatchObject({
      finca_id: 2,
      finca: "Finca Sur",
      monto_total: 150,
    });
    expect(out.rankings.top_clientes[0]).toMatchObject({
      cliente_id: 11,
      cliente: "Cliente Dos",
      monto_total: 150,
    });
    expect(out.extras.metricas_ciclo).toMatchObject({
      entrega_a_liquidacion_dias_promedio: 2.5,
      liquidacion_a_pago_dias_promedio: 1,
      entrega_a_pago_dias_promedio: 4,
    });
  });

  test("reporteComercialVentas responde con estructura vacía consistente cuando no hay datos", async () => {
    models.Venta.findAll.mockResolvedValue([]);

    const out = await ventasActualService.reporteComercialVentas(
      { sub: 1, role: "Tecnico" },
      { finca_ids: "1", desde: "2026-01-01", hasta: "2026-01-31" }
    );

    expect(out.kpis).toMatchObject({
      ventas_periodo: 0,
      total_vendido: 0,
      ticket_promedio: 0,
      clientes_unicos: 0,
    });
    expect(out.graficos.ventas_por_estado).toEqual([]);
    expect(out.rankings.top_clientes).toEqual([]);
    expect(out.tablas.ventas.total).toBe(0);
  });

  test("reporteAbastecimientoCompras calcula totales, rankings y variación de costos sin inventar finca", async () => {
    models.Compra.findAll.mockResolvedValue([
      jsonRow({
        id: 201,
        numero_factura: "FAC-201",
        fecha_compra: "2026-03-02",
        subtotal: "50",
        total: "50",
        estado: "CONFIRMADA",
        proveedor: { id: 50, nombre: "Proveedor A", ruc: "1790" },
        creador: { id: 1, nombres: "Alex", apellidos: "Camacho" },
        detalles: [
          {
            id: 1,
            inventario_item_id: 10,
            cantidad: "4",
            costo_unitario: "5",
            subtotal: "20",
            item: { id: 10, nombre: "Urea", categoria: "Insumo" },
          },
          {
            id: 2,
            inventario_item_id: 20,
            cantidad: "3",
            costo_unitario: "10",
            subtotal: "30",
            item: { id: 20, nombre: "Machete", categoria: "Herramienta" },
          },
        ],
      }),
      jsonRow({
        id: 202,
        numero_factura: "FAC-202",
        fecha_compra: "2026-03-05",
        subtotal: "70",
        total: "70",
        estado: "CONFIRMADA",
        proveedor: { id: 51, nombre: "Proveedor B", ruc: "1888" },
        creador: { id: 2, nombres: "Mora", apellidos: "Vega" },
        detalles: [
          {
            id: 3,
            inventario_item_id: 10,
            cantidad: "5",
            costo_unitario: "6",
            subtotal: "30",
            item: { id: 10, nombre: "Urea", categoria: "Insumo" },
          },
          {
            id: 4,
            inventario_item_id: 30,
            cantidad: "4",
            costo_unitario: "10",
            subtotal: "40",
            item: { id: 30, nombre: "Guantes", categoria: "Equipo" },
          },
        ],
      }),
    ]);
    models.Proveedor.count.mockResolvedValue(7);

    const out = await comprasActualService.reporteAbastecimientoCompras(
      { sub: 1, role: "Tecnico" },
      { finca_ids: "1,2", desde: "2026-03-01", hasta: "2026-03-31", page: 1, pageSize: 1 }
    );

    expect(out.meta.limitaciones[0]).toMatch(/no tiene relacion directa con finca/i);
    expect(out.kpis).toMatchObject({
      compras_periodo: 2,
      monto_total_comprado: 120,
      ticket_promedio: 60,
      proveedores_activos: 7,
      facturas_registradas: 2,
    });
    expect(out.graficos.compras_por_finca).toMatchObject({
      disponible: false,
    });
    expect(out.rankings.top_proveedores[0]).toMatchObject({
      proveedor_id: 51,
      proveedor: "Proveedor B",
      monto_total: 70,
    });
    expect(out.rankings.top_items_por_monto[0]).toMatchObject({
      item_id: 10,
      item: "Urea",
      monto_total: 50,
    });
    expect(out.tablas.variacion_costos[0]).toMatchObject({
      item_id: 10,
      costo_promedio_unitario: 5.5,
      ultimo_costo_unitario: 6,
      variacion_pct: 9.09,
    });
    expect(out.tablas.compras).toMatchObject({
      page: 1,
      pageSize: 1,
      total: 2,
      totalPages: 2,
    });
  });

  test("reporteAltaDireccion consolida ventas, compras, nómina e inventario sin fabricar utilidad por finca", async () => {
    ventasReportService.reporteComercialVentas.mockResolvedValue({
      kpis: {
        total_vendido: 500,
        ventas_periodo: 4,
      },
      graficos: {
        ventas_por_finca: [
          { finca_id: 1, finca: "Finca Norte", monto_total: 300 },
          { finca_id: 2, finca: "Finca Sur", monto_total: 200 },
        ],
        evolucion_por_fecha: [
          { fecha: "2026-03-03", monto_total: 300 },
          { fecha: "2026-03-10", monto_total: 200 },
        ],
      },
      tablas: {
        resumen_por_finca: [
          { finca_id: 1, finca: "Finca Norte", total_vendido: 300 },
          { finca_id: 2, finca: "Finca Sur", total_vendido: 200 },
        ],
      },
      rankings: {
        top_fincas: [{ finca_id: 1, finca: "Finca Norte", monto_total: 300 }],
        top_clientes: [{ cliente_id: 10, cliente: "Cliente Uno", monto_total: 300 }],
      },
    });
    comprasReportService.reporteAbastecimientoCompras.mockResolvedValue({
      kpis: {
        monto_total_comprado: 120,
        compras_periodo: 2,
      },
      graficos: {
        evolucion_por_fecha: [
          { fecha: "2026-03-04", monto_total: 50 },
          { fecha: "2026-03-10", monto_total: 70 },
        ],
      },
      rankings: {
        top_proveedores: [{ proveedor_id: 50, proveedor: "Proveedor A", monto_total: 70 }],
      },
    });
    legacyReportesService.reporteManoObraResumen.mockResolvedValue({
      kpis: { monto_total: 80 },
      series_total_por_semana: [{ semana_iso: "2026-W10", total: 80 }],
    });
    legacyReportesService.reporteInventarioResumen.mockResolvedValue({
      stats: {
        items_sin_stock: 2,
        items_bajo_minimo: 1,
        lotes_por_vencer: 3,
      },
    });
    models.Tarea.count.mockResolvedValue(5);
    models.Tarea.findAll.mockResolvedValue([
      { finca_id: 1, finca_nombre: "Finca Norte", total: 3 },
      { finca_id: 2, finca_nombre: "Finca Sur", total: 2 },
    ]);

    const out = await altaDireccionService.reporteAltaDireccion(
      { sub: 1, role: "Propietario" },
      { finca_ids: "1,2", desde: "2026-03-01", hasta: "2026-03-31" }
    );

    expect(out.kpis).toMatchObject({
      ventas_totales_periodo: 500,
      compras_totales_periodo: 120,
      nomina_total_periodo: 80,
      utilidad_operativa_simple: 300,
      numero_ventas: 4,
      numero_compras: 2,
      tareas_vencidas: 5,
      alertas_inventario: 6,
    });
    expect(out.graficos.comparativo_operativo).toEqual([
      { categoria: "Ventas", total: 500 },
      { categoria: "Compras", total: 120 },
      { categoria: "Nomina", total: 80 },
    ]);
    expect(out.graficos.utilidad_simple_por_finca).toMatchObject({
      disponible: false,
    });
    expect(out.rankings.top_fincas_por_utilidad_simple).toMatchObject({
      disponible: false,
    });
    expect(out.tablas.resumen_ejecutivo_por_finca[0]).toMatchObject({
      finca_id: 1,
      ventas_total: 300,
      compras_total: null,
      nomina_total: null,
      utilidad_simple: null,
      tareas_vencidas: 3,
    });
  });

  test.todo("rechaza fecha_desde mayor que fecha_hasta en filtros globales");
});
