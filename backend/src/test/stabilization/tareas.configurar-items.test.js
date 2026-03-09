jest.mock("../../db", () => ({
  sequelize: {
    transaction: jest.fn(async (fn) => fn({ id: "tx" })),
  },
  models: {
    Tarea: { findByPk: jest.fn() },
    InventarioItem: { findAll: jest.fn() },
    TareaItem: {
      destroy: jest.fn(),
      bulkCreate: jest.fn(),
      findAll: jest.fn(),
    },
    Unidad: {},
  },
}));

jest.mock("../../modules/inventario/inventario.service", () => ({}));
jest.mock("../../modules/notificaciones/notificaciones.service", () => ({}));

const { models } = require("../../db");
const tareasService = require("../../modules/tareas/tareas.service");

describe("tareas.service.configurarItems", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    models.Tarea.findByPk.mockResolvedValue({ id: 77 });
    models.InventarioItem.findAll.mockResolvedValue([
      { id: 1, categoria: "Insumo", unidad_id: 5 },
      { id: 2, categoria: "Herramienta", unidad_id: 6 },
    ]);
    models.TareaItem.findAll.mockResolvedValue([
      {
        id: 1001,
        item_id: 1,
        categoria: "Insumo",
        cantidad_planificada: "3.000",
        InventarioItem: { id: 1, nombre: "Fertilizante", categoria: "Insumo" },
        Unidad: { id: 5, codigo: "kg", nombre: "Kilogramo" },
      },
      {
        id: 1002,
        item_id: 2,
        categoria: "Herramienta",
        cantidad_planificada: "1.000",
        InventarioItem: { id: 2, nombre: "Tijera", categoria: "Herramienta" },
        Unidad: { id: 6, codigo: "und", nombre: "Unidad" },
      },
    ]);
  });

  test("guarda items válidos y responde contrato consistente", async () => {
    const out = await tareasService.configurarItems(
      77,
      [
        { item_id: 1, cantidad_planificada: 3 },
        { inventario_id: 2, cantidad_estimada: 1 },
      ],
      { role: "Tecnico" }
    );

    expect(models.TareaItem.destroy).toHaveBeenCalledTimes(1);
    expect(models.TareaItem.bulkCreate).toHaveBeenCalledTimes(1);
    expect(out.tarea_id).toBe(77);
    expect(out.items).toHaveLength(2);
    expect(out.items[0]).toMatchObject({
      item_id: 1,
      inventario_id: 1,
      cantidad_planificada: 3,
      cantidad_estimada: 3,
    });
  });

  test("payload inválido responde BAD_REQUEST en vez de 500", async () => {
    await expect(
      tareasService.configurarItems(
        77,
        [{ item_id: 1, cantidad_planificada: 0 }],
        { role: "Tecnico" }
      )
    ).rejects.toMatchObject({ status: 400, code: "BAD_REQUEST" });
  });
});

