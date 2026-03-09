jest.mock("../../db", () => ({
  models: {
    Tarea: { sequelize: { query: jest.fn() } },
    Cosecha: {},
  },
}));

const reportesService = require("../../modules/reportes/reportes.service");

describe("reportes.service produccion deprecado", () => {
  test("resumen devuelve contrato deprecado explicito", async () => {
    const out = await reportesService.reporteProduccionResumen(
      { role: "Tecnico" },
      { finca_id: 1, desde: "2026-01-01", hasta: "2026-01-31" }
    );

    expect(out?.header).toMatchObject({
      deprecated: true,
      scope: "resumen",
      code: "DEPRECATED_DOMAIN_FLOW",
    });
    expect(out).toHaveProperty("produccion");
    expect(out).toHaveProperty("logistica");
    expect(out).toHaveProperty("economico");
  });

  test("comparar lotes devuelve contrato deprecado explicito", async () => {
    const out = await reportesService.compararLotes(
      { role: "Tecnico" },
      { finca_id: 1, desde: "2026-01-01", hasta: "2026-01-31", lote_ids: "10,11" }
    );

    expect(out?.header).toMatchObject({
      deprecated: true,
      scope: "comparar-lotes",
      code: "DEPRECATED_DOMAIN_FLOW",
    });
    expect(Array.isArray(out?.items)).toBe(true);
  });
});
