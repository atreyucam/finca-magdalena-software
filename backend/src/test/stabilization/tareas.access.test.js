jest.mock("../../db", () => ({
  models: {
    Usuario: { findByPk: jest.fn() },
    Tarea: { findByPk: jest.fn() },
    TareaAsignacion: { findOne: jest.fn() },
  },
}));

const { models } = require("../../db");
const { assertTaskResourceAccess } = require("../../modules/tareas/tareas.access");

describe("tareas.access", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    models.Usuario.findByPk.mockResolvedValue({ id: 10, estado: "Activo" });
    models.Tarea.findByPk.mockResolvedValue({ id: 99, estado: "Asignada" });
    models.TareaAsignacion.findOne.mockResolvedValue({ id: 1 });
  });

  test("permite acceso a Propietario/Tecnico sin asignación explícita", async () => {
    await expect(
      assertTaskResourceAccess({ tareaId: 99, userId: 10, userRole: "Tecnico" })
    ).resolves.toMatchObject({ id: 99 });

    expect(models.TareaAsignacion.findOne).not.toHaveBeenCalled();
  });

  test("permite acceso a trabajador asignado", async () => {
    await expect(
      assertTaskResourceAccess({ tareaId: 99, userId: 10, userRole: "Trabajador" })
    ).resolves.toMatchObject({ id: 99 });
  });

  test("bloquea trabajador no asignado", async () => {
    models.TareaAsignacion.findOne.mockResolvedValue(null);

    await expect(
      assertTaskResourceAccess({ tareaId: 99, userId: 10, userRole: "Trabajador" })
    ).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
  });

  test("bloquea usuario inactivo", async () => {
    models.Usuario.findByPk.mockResolvedValue({ id: 10, estado: "Inactivo" });

    await expect(
      assertTaskResourceAccess({ tareaId: 99, userId: 10, userRole: "Tecnico" })
    ).rejects.toMatchObject({ status: 401, code: "USER_INACTIVE" });
  });
});

