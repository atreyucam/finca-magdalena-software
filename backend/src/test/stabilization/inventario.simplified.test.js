jest.mock("../../db", () => ({
  sequelize: {
    transaction: jest.fn(async (fn) => fn({ LOCK: { UPDATE: "UPDATE" } })),
  },
  models: {
    Unidad: { findByPk: jest.fn() },
    InventarioItem: {
      create: jest.fn(),
      findByPk: jest.fn(),
      findAndCountAll: jest.fn(),
    },
    InventarioMovimiento: {
      create: jest.fn(),
      findAndCountAll: jest.fn(),
    },
  },
}));

jest.mock("../../modules/notificaciones/notificaciones.service", () => ({
  crearParaRoles: jest.fn(),
  crear: jest.fn(),
}));

jest.mock("../../utils/units", () => ({
  getFactorConversion: jest.fn(() => 1),
}));

const { models } = require("../../db");
const service = require("../../modules/inventario/inventario.service");

describe("inventario.service dominio simplificado", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    models.Unidad.findByPk
      .mockResolvedValueOnce({ id: 10, codigo: "kg" })
      .mockResolvedValueOnce({ id: 10, codigo: "kg" });
  });

  test("crear insumo no requiere lote/vencimiento y guarda fabricante", async () => {
    const itemRecord = {
      id: 1,
      nombre: "Fertilizante NPK",
      categoria: "Insumo",
      unidad_id: 10,
      stock_actual: "0.000",
      stock_minimo: "2.000",
      meta: { fabricante: "ACME" },
      save: jest.fn(async () => {}),
      toJSON() {
        return {
          id: this.id,
          nombre: this.nombre,
          categoria: this.categoria,
          unidad_id: this.unidad_id,
          stock_actual: this.stock_actual,
          stock_minimo: this.stock_minimo,
          meta: this.meta,
        };
      },
    };

    models.InventarioItem.create.mockResolvedValue(itemRecord);

    const out = await service.crearItem({
      nombre: "Fertilizante NPK",
      categoria: "Insumo",
      unidad_id: 10,
      stock_inicial: 5,
      stock_minimo: 2,
      fabricante: "ACME",
    });

    expect(out).toMatchObject({ id: 1, nombre: "Fertilizante NPK" });

    const createPayload = models.InventarioItem.create.mock.calls[0][0];
    expect(createPayload.meta).toMatchObject({ fabricante: "ACME" });
    expect(createPayload.meta.ingrediente_activo).toBeUndefined();
    expect(createPayload.meta.formulacion).toBeUndefined();

    expect(models.InventarioMovimiento.create).toHaveBeenCalled();
    expect(models.InventarioMovimiento.create.mock.calls[0][0]).toMatchObject({ lote_id: null });
  });

  test("ajustar stock funciona sin datos de lote", async () => {
    const item = {
      id: 2,
      nombre: "Machete",
      categoria: "Herramienta",
      unidad_id: 11,
      stock_actual: "3.000",
      stock_minimo: "1.000",
      activo: true,
      save: jest.fn(async function save() {
        return this;
      }),
    };

    models.InventarioItem.findByPk.mockResolvedValue(item);
    models.Unidad.findByPk
      .mockResolvedValueOnce({ id: 11, codigo: "und" })
      .mockResolvedValueOnce({ id: 11, codigo: "und" });

    const out = await service.ajustarStock(
      { sub: 99 },
      2,
      { tipo: "AJUSTE_ENTRADA", cantidad: 2, unidad_id: 11, motivo: "Reposicion" }
    );

    expect(Number(out.stock_actual)).toBeGreaterThan(3);
    expect(models.InventarioMovimiento.create).toHaveBeenCalled();
    expect(models.InventarioMovimiento.create.mock.calls[0][0]).toMatchObject({ lote_id: null });
  });

  test("listar items devuelve contrato simplificado", async () => {
    models.InventarioItem.findAndCountAll.mockResolvedValue({
      count: 1,
      rows: [
        {
          id: 3,
          nombre: "Urea",
          categoria: "Insumo",
          activo: true,
          Unidad: { codigo: "kg" },
          stock_actual: "12.500",
          stock_minimo: "3.000",
          meta: { fabricante: "Proveedor X" },
        },
      ],
    });

    const out = await service.listarItems({ categoria: "Insumo" });
    expect(out.data).toHaveLength(1);
    expect(out.data[0]).toMatchObject({
      nombre: "Urea",
      fabricante: "Proveedor X",
      stock_total: "12.500",
    });
    expect(Object.prototype.hasOwnProperty.call(out.data[0], "lotes")).toBe(false);
  });

  test("endpoints de lote quedan deprecados", async () => {
    await expect(service.editarLote(1, {})).rejects.toMatchObject({ status: 410, code: "DEPRECATED" });
    await expect(service.buscarLote(1, { codigo: "A-1" })).rejects.toMatchObject({ status: 410, code: "DEPRECATED" });
  });
});
