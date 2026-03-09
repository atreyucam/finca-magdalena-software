jest.mock("../../db", () => ({
  models: {
    Proveedor: {
      create: jest.fn(),
      findAndCountAll: jest.fn(),
    },
  },
}));

const { models } = require("../../db");
const service = require("../../modules/proveedores/proveedores.service");

describe("proveedores.service v1", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("crea proveedor valido", async () => {
    models.Proveedor.create.mockResolvedValue({
      id: 15,
      nombre: "Agroinsumos Central",
      ruc: "1790011223001",
      telefono: "0999999999",
      correo: "compras@agro.com",
      direccion: "Via principal",
      activo: true,
      created_at: "2026-03-09T10:00:00.000Z",
      updated_at: "2026-03-09T10:00:00.000Z",
    });

    const out = await service.crearProveedor({
      nombre: "Agroinsumos Central",
      ruc: "1790011223001",
      telefono: "0999999999",
      correo: "Compras@Agro.com",
      direccion: "Via principal",
    });

    expect(models.Proveedor.create).toHaveBeenCalledTimes(1);
    expect(models.Proveedor.create.mock.calls[0][0]).toMatchObject({
      nombre: "Agroinsumos Central",
      ruc: "1790011223001",
      correo: "compras@agro.com",
      activo: true,
    });
    expect(out).toMatchObject({
      id: 15,
      nombre: "Agroinsumos Central",
      ruc: "1790011223001",
    });
  });

  test("rechaza ruc invalido", async () => {
    await expect(
      service.crearProveedor({
        nombre: "Proveedor X",
        ruc: "12",
      })
    ).rejects.toMatchObject({ status: 400, code: "BAD_REQUEST" });
  });

  test("mapea conflicto de ruc duplicado", async () => {
    const err = new Error("duplicate");
    err.name = "SequelizeUniqueConstraintError";
    models.Proveedor.create.mockRejectedValue(err);

    await expect(
      service.crearProveedor({
        nombre: "Proveedor X",
        ruc: "1790011223001",
      })
    ).rejects.toMatchObject({ status: 409, code: "CONFLICT" });
  });

  test("lista proveedores con paginacion", async () => {
    models.Proveedor.findAndCountAll.mockResolvedValue({
      count: 1,
      rows: [
        {
          id: 7,
          nombre: "Proveedor Uno",
          ruc: null,
          telefono: null,
          correo: null,
          direccion: null,
          activo: true,
          created_at: "2026-03-09T10:00:00.000Z",
          updated_at: "2026-03-09T10:00:00.000Z",
        },
      ],
    });

    const out = await service.listarProveedores({ q: "uno", page: 1, pageSize: 10 });
    expect(out.total).toBe(1);
    expect(out.page).toBe(1);
    expect(out.pageSize).toBe(10);
    expect(out.data[0]).toMatchObject({ id: 7, nombre: "Proveedor Uno" });
  });
});
