const express = require("express");
const request = require("supertest");

jest.mock("../../middlewares/auth.middleware", () => ({
  requireAuth: (req, _res, next) => {
    req.user = { id: 7, sub: 7, role: "Tecnico" };
    next();
  },
}));

jest.mock("../../middlewares/rbac.middleware", () => ({
  requireRole: () => (_req, _res, next) => next(),
}));

jest.mock("../../middlewares/rateLimitByUser.middleware", () => ({
  rateLimitByUser: () => (_req, _res, next) => next(),
}));

jest.mock("../../modules/reportes/reportes.service", () => ({
  reporteTareas: jest.fn(),
  reporteInventarioResumen: jest.fn(),
  reporteInventarioStock: jest.fn(),
  reporteInventarioFefo: jest.fn(),
  reporteInventarioPrestamos: jest.fn(),
  reporteManoObraResumen: jest.fn(),
  reporteManoObraDetallado: jest.fn(),
  reporteProduccionResumen: jest.fn(),
  reporteProduccionPorLote: jest.fn(),
  reporteProduccionClasificacion: jest.fn(),
  reporteProduccionMerma: jest.fn(),
  reporteProduccionLogistica: jest.fn(),
  reporteProduccionEventos: jest.fn(),
  compararFincas: jest.fn(),
  compararCosechas: jest.fn(),
  compararLotes: jest.fn(),
  reporteDashboard: jest.fn(),
}));

jest.mock("../../modules/reportes/altaDireccion/reportes.alta-direccion.service", () => ({
  reporteAltaDireccion: jest.fn(),
}));

jest.mock("../../modules/reportes/ventas/reportes.ventas.service", () => ({
  reporteComercialVentas: jest.fn(),
}));

jest.mock("../../modules/reportes/compras/reportes.compras.service", () => ({
  reporteAbastecimientoCompras: jest.fn(),
}));

jest.mock("../../modules/reportes/reportes.filtros.controller", () => ({
  listarFincas: jest.fn((_req, res) => res.json([])),
  listarCosechasPorFinca: jest.fn((_req, res) => res.json([])),
  listarLotesPorFinca: jest.fn((_req, res) => res.json([])),
}));

const legacyService = require("../../modules/reportes/reportes.service");
const altaDireccionService = require("../../modules/reportes/altaDireccion/reportes.alta-direccion.service");
const ventasService = require("../../modules/reportes/ventas/reportes.ventas.service");
const comprasService = require("../../modules/reportes/compras/reportes.compras.service");
const reportesRouter = require("../../modules/reportes/reportes.routes");

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/reportes", reportesRouter);
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({
      code: err.code || "INTERNAL_ERROR",
      message: err.message || "Error interno",
    });
  });
  return app;
}

describe("reportes fase 1 - integración HTTP route/controller", () => {
  const app = buildApp();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("GET /reportes/comercial/ventas llama al service correcto y retorna contrato estándar", async () => {
    ventasService.reporteComercialVentas.mockResolvedValue({
      kpis: { ventas_periodo: 2 },
      graficos: { ventas_por_estado: [] },
      tablas: { ventas: { rows: [] } },
      rankings: { top_clientes: [] },
    });

    const res = await request(app).get(
      "/reportes/comercial/ventas?finca_ids=1,2&desde=2026-03-01&hasta=2026-03-31"
    );

    expect(res.statusCode).toBe(200);
    expect(ventasService.reporteComercialVentas).toHaveBeenCalledWith(
      expect.objectContaining({ role: "Tecnico", sub: 7 }),
      expect.objectContaining({
        finca_ids: "1,2",
        desde: "2026-03-01",
        hasta: "2026-03-31",
      })
    );
    expect(res.body).toHaveProperty("kpis");
    expect(res.body).toHaveProperty("graficos");
    expect(res.body).toHaveProperty("tablas");
    expect(res.body).toHaveProperty("rankings");
  });

  test("GET /reportes/abastecimiento/compras propaga errores controlados del backend", async () => {
    const error = new Error("Rango de fechas inválido");
    error.status = 400;
    error.code = "BAD_REQUEST";
    comprasService.reporteAbastecimientoCompras.mockRejectedValue(error);

    const res = await request(app).get("/reportes/abastecimiento/compras?desde=2026-04-01&hasta=2026-03-01");

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({
      code: "BAD_REQUEST",
      message: "Rango de fechas inválido",
    });
  });

  test("GET /reportes/alta-direccion retorna consolidado ejecutivo", async () => {
    altaDireccionService.reporteAltaDireccion.mockResolvedValue({
      kpis: { utilidad_operativa_simple: 320 },
      graficos: { comparativo_operativo: [] },
      tablas: { resumen_ejecutivo_por_finca: [] },
      rankings: { top_fincas_por_ventas: [] },
    });

    const res = await request(app).get("/reportes/alta-direccion?finca_ids=1");

    expect(res.statusCode).toBe(200);
    expect(altaDireccionService.reporteAltaDireccion).toHaveBeenCalledWith(
      expect.objectContaining({ role: "Tecnico", sub: 7 }),
      expect.objectContaining({ finca_ids: "1" })
    );
    expect(res.body.kpis.utilidad_operativa_simple).toBe(320);
  });

  test("GET /reportes/dashboard sigue respondiendo para no regresión básica", async () => {
    legacyService.reporteDashboard.mockResolvedValue({
      kpis: { total_tareas: 5 },
      charts: { tareas_por_estado: {} },
      tareas: { hoy: [] },
      inventario: { resumen: {} },
    });

    const res = await request(app).get("/reportes/dashboard");

    expect(res.statusCode).toBe(200);
    expect(legacyService.reporteDashboard).toHaveBeenCalledTimes(1);
    expect(res.body.kpis.total_tareas).toBe(5);
  });
});
