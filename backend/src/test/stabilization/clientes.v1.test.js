jest.mock("../../db", () => ({
  models: {
    Cliente: {
      create: jest.fn(),
      findAndCountAll: jest.fn(),
      findByPk: jest.fn(),
    },
  },
}));

const { models } = require("../../db");
const service = require("../../modules/clientes/clientes.service");

describe("clientes.service v1", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("crea cliente valido", async () => {
    models.Cliente.create.mockResolvedValue({
      id: 21,
      nombre: "Comercial Andina",
      identificacion: "1790011223001",
      telefono: "0999999999",
      correo: "ventas@andina.com",
      direccion: "Centro",
      activo: true,
      created_at: "2026-03-09T10:00:00.000Z",
      updated_at: "2026-03-09T10:00:00.000Z",
    });

    const out = await service.crearCliente({
      nombre: "Comercial Andina",
      identificacion: "1790011223001",
      telefono: "0999999999",
      correo: "Ventas@Andina.com",
      direccion: "Centro",
    });

    expect(models.Cliente.create).toHaveBeenCalledTimes(1);
    expect(models.Cliente.create.mock.calls[0][0]).toMatchObject({
      nombre: "Comercial Andina",
      identificacion: "1790011223001",
      correo: "ventas@andina.com",
      activo: true,
    });

    expect(out).toMatchObject({
      id: 21,
      nombre: "Comercial Andina",
      identificacion: "1790011223001",
    });
  });

  test("rechaza correo invalido", async () => {
    await expect(
      service.crearCliente({
        nombre: "Cliente X",
        correo: "correo-invalido",
      })
    ).rejects.toMatchObject({ status: 400, code: "BAD_REQUEST" });
  });

  test("mapea conflicto por identificacion duplicada", async () => {
    const err = new Error("duplicate");
    err.name = "SequelizeUniqueConstraintError";
    models.Cliente.create.mockRejectedValue(err);

    await expect(
      service.crearCliente({
        nombre: "Cliente X",
        identificacion: "1790011223001",
      })
    ).rejects.toMatchObject({ status: 409, code: "CONFLICT" });
  });

  test("edita cliente existente", async () => {
    const save = jest.fn(async function saveFn() {
      return this;
    });
    models.Cliente.findByPk.mockResolvedValue({
      id: 9,
      nombre: "Cliente Antiguo",
      identificacion: "1790011223001",
      telefono: null,
      correo: null,
      direccion: null,
      activo: true,
      created_at: "2026-03-09T10:00:00.000Z",
      updated_at: "2026-03-09T10:00:00.000Z",
      save,
    });

    const out = await service.editarCliente(9, {
      nombre: "Cliente Editado",
      telefono: "0999999999",
      direccion: "Nueva direccion",
    });

    expect(models.Cliente.findByPk).toHaveBeenCalledWith(9);
    expect(save).toHaveBeenCalledTimes(1);
    expect(out).toMatchObject({
      id: 9,
      nombre: "Cliente Editado",
      telefono: "0999999999",
      direccion: "Nueva direccion",
    });
  });

  test("lista clientes con paginacion", async () => {
    models.Cliente.findAndCountAll.mockResolvedValue({
      count: 1,
      rows: [
        {
          id: 7,
          nombre: "Cliente Uno",
          identificacion: null,
          telefono: null,
          correo: null,
          direccion: null,
          activo: true,
          created_at: "2026-03-09T10:00:00.000Z",
          updated_at: "2026-03-09T10:00:00.000Z",
        },
      ],
    });

    const out = await service.listarClientes({ q: "uno", page: 1, pageSize: 10 });
    expect(out.total).toBe(1);
    expect(out.page).toBe(1);
    expect(out.pageSize).toBe(10);
    expect(out.data[0]).toMatchObject({ id: 7, nombre: "Cliente Uno" });
  });
});
