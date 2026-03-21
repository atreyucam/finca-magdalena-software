jest.mock("../../db", () => ({
  models: {
    Notificacion: {
      create: jest.fn(),
      findAll: jest.fn(),
      findAndCountAll: jest.fn(),
      count: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      destroy: jest.fn(),
    },
    Usuario: {
      findAll: jest.fn(),
    },
  },
}));

jest.mock("../../config/env", () => ({
  config: {
    notifications: {
      retentionDays: 90,
    },
  },
}));

const { models } = require("../../db");
const service = require("../../modules/notificaciones/notificaciones.service");

function buildDbNotif(overrides = {}) {
  const now = new Date("2026-03-09T12:00:00.000Z");
  return {
    id: 1,
    usuario_id: 99,
    tipo: "Inventario",
    titulo: "Compra registrada",
    mensaje: "Se registro la compra FAC-100 por $25.00.",
    referencia: { tipo_evento: "COMPRA_REGISTRADA", compra_id: 100 },
    leida: false,
    read_at: null,
    prioridad: "Info",
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

describe("notificaciones.service filtro de ruido genérico", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("no persiste placeholders genéricos como título", async () => {
    const result = await service.crear(99, {
      tipo: "General",
      titulo: "Tienes una notificación nueva",
      mensaje: "",
    });

    expect(result).toBeNull();
    expect(models.Notificacion.create).not.toHaveBeenCalled();
  });

  test("si el mensaje es genérico, se limpia y persiste solo contenido útil", async () => {
    models.Notificacion.create.mockImplementation(async (payload) =>
      buildDbNotif({
        id: 2,
        ...payload,
      })
    );

    const result = await service.crear(99, {
      tipo: "Inventario",
      titulo: "Compra registrada",
      mensaje: "Tienes 1 notificación nueva",
      referencia: { tipo_evento: "COMPRA_REGISTRADA", compra_id: 100 },
      prioridad: "Info",
    });

    expect(models.Notificacion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        titulo: "Compra registrada",
        mensaje: "",
      })
    );
    expect(result).toMatchObject({
      titulo: "Compra registrada",
      mensaje: "",
    });
  });

  test("inyecta actor_id en referencia para distinguir actor vs destinatarios", async () => {
    models.Notificacion.create.mockImplementation(async (payload) =>
      buildDbNotif({
        id: 3,
        ...payload,
      })
    );

    const result = await service.crear(99, {
      tipo: "Inventario",
      titulo: "Nuevo ítem de inventario",
      mensaje: 'Se creó el ítem "Urea" (Insumo).',
      actor_id: 77,
      referencia: { item_id: 15 },
      prioridad: "Info",
    });

    expect(models.Notificacion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        referencia: expect.objectContaining({ item_id: 15, actor_id: 77 }),
      })
    );
    expect(result?.referencia).toMatchObject({ item_id: 15, actor_id: 77 });
  });

  test("listar filtra ruido genérico y ajusta conteos visibles", async () => {
    models.Notificacion.findAndCountAll.mockResolvedValue({
      count: 2,
      rows: [
        buildDbNotif({
          id: 10,
          titulo: "Tienes una notificación nueva",
          mensaje: "",
          leida: false,
        }),
        buildDbNotif({
          id: 11,
          titulo: "Compra registrada",
          mensaje: "Se registro la compra FAC-101 por $50.00.",
          leida: false,
        }),
      ],
    });
    models.Notificacion.count.mockResolvedValue(2);

    const result = await service.listar({ sub: 99 }, { limit: 20, offset: 0 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: 11,
      titulo: "Compra registrada",
    });
    expect(result.total).toBe(1);
    expect(result.noLeidas).toBe(1);
  });
});
