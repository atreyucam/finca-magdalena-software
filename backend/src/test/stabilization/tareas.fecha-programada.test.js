jest.mock("../../db", () => ({
  sequelize: {
    transaction: jest.fn(async (fn) => fn({ LOCK: { UPDATE: "UPDATE" } })),
  },
  models: {},
}));

jest.mock("../../modules/inventario/inventario.service", () => ({}));
jest.mock("../../modules/notificaciones/notificaciones.service", () => ({}));

const tareasService = require("../../modules/tareas/tareas.service");

describe("tareas.service parseFechaProgramada", () => {
  test("acepta fecha y hora real", () => {
    const out = tareasService._parseFechaProgramada("2026-03-09T14:35");
    expect(out).toBeInstanceOf(Date);
    expect(Number.isNaN(out.getTime())).toBe(false);
  });

  test("rechaza valor con solo fecha (sin hora)", () => {
    expect(() => tareasService._parseFechaProgramada("2026-03-09")).toThrow(
      /fecha y hora/i
    );
  });

  test("rechaza valor invalido", () => {
    expect(() => tareasService._parseFechaProgramada("no-es-fecha")).toThrow(
      /fecha programada/i
    );
  });
});
