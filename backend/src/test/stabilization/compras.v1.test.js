jest.mock("../../db", () => ({
  sequelize: {
    transaction: jest.fn(async (fn) => fn({ LOCK: { UPDATE: "UPDATE" } })),
  },
  models: {
    Compra: {
      findOne: jest.fn(),
      create: jest.fn(),
      findByPk: jest.fn(),
      findAndCountAll: jest.fn(),
    },
    CompraDetalle: {
      bulkCreate: jest.fn(),
    },
    Proveedor: {
      findOne: jest.fn(),
    },
    InventarioItem: {
      findAll: jest.fn(),
    },
  },
}));

jest.mock("../../modules/inventario/inventario.service", () => ({
  _moverStock: jest.fn(),
}));

jest.mock("../../modules/notificaciones/notificaciones.service", () => ({
  crearParaRoles: jest.fn(),
}));

const { sequelize, models } = require("../../db");
const inventarioService = require("../../modules/inventario/inventario.service");
const notificacionesService = require("../../modules/notificaciones/notificaciones.service");
const service = require("../../modules/compras/compras.service");

function buildCompraDetalleMock() {
  return {
    id: 101,
    numero_factura: "FAC-001",
    fecha_compra: "2026-03-09",
    observacion: "observacion",
    subtotal: "42.50",
    total: "42.50",
    estado: "CONFIRMADA",
    created_at: "2026-03-09T10:00:00.000Z",
    updated_at: "2026-03-09T10:00:00.000Z",
    proveedor: {
      id: 8,
      nombre: "Proveedor Uno",
      ruc: "1790011223001",
      telefono: null,
      correo: null,
      direccion: null,
      activo: true,
    },
    creador: {
      id: 1,
      nombres: "Alex",
      apellidos: "Camacho",
    },
    detalles: [
      {
        id: 1,
        inventario_item_id: 11,
        cantidad: "2.000",
        costo_unitario: "10.0000",
        subtotal: "20.00",
        item: {
          id: 11,
          nombre: "Urea",
          categoria: "Insumo",
          Unidad: { id: 1, codigo: "KG", nombre: "Kilogramo" },
        },
      },
      {
        id: 2,
        inventario_item_id: 22,
        cantidad: "3.000",
        costo_unitario: "7.5000",
        subtotal: "22.50",
        item: {
          id: 22,
          nombre: "Machete",
          categoria: "Herramienta",
          Unidad: { id: 2, codigo: "UND", nombre: "Unidad" },
        },
      },
    ],
  };
}

describe("compras.service v1", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    models.Compra.findOne.mockResolvedValue(null);
    models.Proveedor.findOne.mockResolvedValue({ id: 8, activo: true });
    models.InventarioItem.findAll.mockResolvedValue([
      { id: 11, unidad_id: 1, stock_actual: "0.000", stock_minimo: "0.000", save: jest.fn() },
      { id: 22, unidad_id: 2, stock_actual: "0.000", stock_minimo: "0.000", save: jest.fn() },
    ]);
    models.Compra.create.mockResolvedValue({ id: 101 });
    models.Compra.findByPk.mockResolvedValue(buildCompraDetalleMock());
    inventarioService._moverStock.mockResolvedValue({ stock_actual: "1.000" });
    notificacionesService.crearParaRoles.mockResolvedValue([]);
  });

  test("crea compra valida, recalcula totales y registra movimientos", async () => {
    const payload = {
      numero_factura: "fac-001",
      proveedor_id: 8,
      fecha_compra: "2026-03-09",
      subtotal: 9999,
      total: 9999,
      detalles: [
        { inventario_item_id: 11, cantidad: 2, costo_unitario: 10 },
        { inventario_item_id: 22, cantidad: 3, costo_unitario: 7.5 },
      ],
    };

    const out = await service.crearCompra({ sub: 1, role: "Propietario" }, payload);

    expect(sequelize.transaction).toHaveBeenCalledTimes(1);
    expect(models.Compra.create).toHaveBeenCalledTimes(1);
    expect(models.Compra.create.mock.calls[0][0]).toMatchObject({
      numero_factura: "FAC-001",
      subtotal: "42.50",
      total: "42.50",
      estado: "CONFIRMADA",
      creado_por: 1,
    });

    expect(models.CompraDetalle.bulkCreate).toHaveBeenCalledTimes(1);
    expect(models.CompraDetalle.bulkCreate.mock.calls[0][0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ inventario_item_id: 11, subtotal: "20.00" }),
        expect.objectContaining({ inventario_item_id: 22, subtotal: "22.50" }),
      ])
    );

    expect(inventarioService._moverStock).toHaveBeenCalledTimes(2);
    expect(inventarioService._moverStock.mock.calls[0][0]).toMatchObject({
      tipo: "ENTRADA_COMPRA",
      referencia: expect.objectContaining({
        referencia_tipo: "COMPRA",
        referencia_id: 101,
      }),
    });
    expect(notificacionesService.crearParaRoles).toHaveBeenCalledTimes(1);
    expect(out).toMatchObject({
      id: 101,
      numero_factura: "FAC-001",
      estado: "CONFIRMADA",
    });
  });

  test("rechaza numero_factura duplicado", async () => {
    models.Compra.findOne.mockResolvedValue({ id: 999 });

    await expect(
      service.crearCompra(
        { sub: 1, role: "Propietario" },
        {
          numero_factura: "FAC-001",
          proveedor_id: 8,
          detalles: [{ inventario_item_id: 11, cantidad: 1, costo_unitario: 2 }],
        }
      )
    ).rejects.toMatchObject({ status: 409, code: "CONFLICT" });
  });

  test("rechaza compra sin items", async () => {
    await expect(
      service.crearCompra(
        { sub: 1, role: "Propietario" },
        { numero_factura: "FAC-001", proveedor_id: 8, detalles: [] }
      )
    ).rejects.toMatchObject({ status: 400, code: "BAD_REQUEST" });
  });

  test("rechaza item repetido en la misma compra", async () => {
    await expect(
      service.crearCompra(
        { sub: 1, role: "Propietario" },
        {
          numero_factura: "FAC-001",
          proveedor_id: 8,
          detalles: [
            { inventario_item_id: 11, cantidad: 1, costo_unitario: 2 },
            { inventario_item_id: 11, cantidad: 1, costo_unitario: 3 },
          ],
        }
      )
    ).rejects.toMatchObject({ status: 400, code: "BAD_REQUEST" });
  });

  test("rechaza cantidad invalida", async () => {
    await expect(
      service.crearCompra(
        { sub: 1, role: "Propietario" },
        {
          numero_factura: "FAC-001",
          proveedor_id: 8,
          detalles: [{ inventario_item_id: 11, cantidad: 0, costo_unitario: 2 }],
        }
      )
    ).rejects.toMatchObject({ status: 400, code: "BAD_REQUEST" });
  });

  test("rechaza costo_unitario invalido", async () => {
    await expect(
      service.crearCompra(
        { sub: 1, role: "Propietario" },
        {
          numero_factura: "FAC-001",
          proveedor_id: 8,
          detalles: [{ inventario_item_id: 11, cantidad: 1, costo_unitario: 0 }],
        }
      )
    ).rejects.toMatchObject({ status: 400, code: "BAD_REQUEST" });
  });

  test("si falla movimiento, no se notifica y la transaccion falla", async () => {
    inventarioService._moverStock
      .mockResolvedValueOnce({ stock_actual: "1.000" })
      .mockRejectedValueOnce(new Error("Fallo movimiento"));

    await expect(
      service.crearCompra(
        { sub: 1, role: "Propietario" },
        {
          numero_factura: "FAC-001",
          proveedor_id: 8,
          detalles: [
            { inventario_item_id: 11, cantidad: 2, costo_unitario: 10 },
            { inventario_item_id: 22, cantidad: 3, costo_unitario: 7.5 },
          ],
        }
      )
    ).rejects.toThrow("Fallo movimiento");

    expect(notificacionesService.crearParaRoles).not.toHaveBeenCalled();
  });

  test("lista compras con contrato paginado", async () => {
    models.Compra.findAndCountAll.mockResolvedValue({
      count: 1,
      rows: [
        {
          id: 1,
          numero_factura: "FAC-001",
          fecha_compra: "2026-03-09",
          subtotal: "10.00",
          total: "10.00",
          estado: "CONFIRMADA",
          created_at: "2026-03-09T10:00:00.000Z",
          updated_at: "2026-03-09T10:00:00.000Z",
          proveedor: { id: 8, nombre: "Proveedor Uno", ruc: null },
          creador: { id: 1, nombres: "Alex", apellidos: "Camacho" },
        },
      ],
    });

    const out = await service.listarCompras({ q: "FAC-001", page: 1, pageSize: 10 });
    expect(out.total).toBe(1);
    expect(out.data[0]).toMatchObject({
      numero_factura: "FAC-001",
      estado: "CONFIRMADA",
      proveedor: { nombre: "Proveedor Uno" },
    });
  });
});
