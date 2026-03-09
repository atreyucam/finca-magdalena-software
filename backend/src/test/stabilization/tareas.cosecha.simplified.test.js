jest.mock("../../db", () => ({
  sequelize: {
    transaction: jest.fn(async (fn) => fn({ LOCK: { UPDATE: "UPDATE" } })),
  },
  models: {},
}));

jest.mock("../../modules/inventario/inventario.service", () => ({}));
jest.mock("../../modules/notificaciones/notificaciones.service", () => ({}));

const tareasService = require("../../modules/tareas/tareas.service");

describe("tareas.service cosecha simplificada", () => {
  test("normaliza clasificacion nueva y calcula total de gavetas", () => {
    const out = tareasService._sanitizarDetallesCosecha({
      clasificacion: {
        exportacion: 3,
        nacional: 2,
        rechazo: 1,
      },
      entrega: { centro_acopio: "Legacy" },
      liquidacion: [{ valor_total: 100 }],
    });

    expect(out).toEqual({
      clasificacion: {
        exportacion: 3,
        nacional: 2,
        rechazo: 1,
        total_gavetas: 6,
      },
      total_gavetas: 6,
    });
  });

  test("convierte estructura legacy por destino a clasificacion simple", () => {
    const out = tareasService._sanitizarDetallesCosecha({
      clasificacion: [
        { destino: "Exportacion", gabetas: 4 },
        { destino: "Nacional", gabetas: 5 },
        { destino: "Rechazo", gabetas: 2 },
      ],
    });

    expect(out.clasificacion).toMatchObject({
      exportacion: 4,
      nacional: 5,
      rechazo: 2,
      total_gavetas: 11,
    });
    expect(out.total_gavetas).toBe(11);
  });

  test("acepta llaves top-level para compatibilidad", () => {
    const out = tareasService._sanitizarDetallesCosecha({
      exportacion: "1",
      nacional: "2",
      rechazo: "0",
    });

    expect(out).toEqual({
      clasificacion: {
        exportacion: 1,
        nacional: 2,
        rechazo: 0,
        total_gavetas: 3,
      },
      total_gavetas: 3,
    });
  });
});
