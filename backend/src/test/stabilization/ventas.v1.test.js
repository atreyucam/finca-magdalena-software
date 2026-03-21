jest.mock("../../db", () => ({
  sequelize: {
    transaction: jest.fn(async (fn) => fn({ LOCK: { UPDATE: "UPDATE" } })),
  },
  models: {
    Cliente: {
      findOne: jest.fn(),
    },
    Lote: {
      findOne: jest.fn(),
      findByPk: jest.fn(),
    },
    Finca: {},
    Tarea: {
      findAll: jest.fn(),
    },
    TipoActividad: {},
    Venta: {
      findOne: jest.fn(),
      create: jest.fn(),
      findByPk: jest.fn(),
      findAndCountAll: jest.fn(),
      sum: jest.fn(),
    },
    VentaDetalle: {
      destroy: jest.fn(),
      bulkCreate: jest.fn(),
    },
    Usuario: {},
  },
}));

jest.mock("../../modules/notificaciones/notificaciones.service", () => ({
  crearParaRoles: jest.fn(),
}));

const { sequelize, models } = require("../../db");
const notificacionesService = require("../../modules/notificaciones/notificaciones.service");
const service = require("../../modules/ventas/ventas.service");

function buildVentaDetalleMock(overrides = {}) {
  return {
    id: 101,
    numero_factura: "VTA-000011",
    numero_recibo: null,
    fecha_entrega: "2026-03-09",
    fecha_liquidacion: null,
    fecha_pago: null,
    tipo_venta: "EXPORTACION",
    gavetas_entregadas: "10.00",
    gavetas_devueltas: null,
    gavetas_utiles: null,
    subtotal: "0.00",
    total: "0.00",
    estado: "PENDIENTE",
    forma_pago: null,
    observacion: "Entrega inicial",
    observacion_pago: null,
    reclasificacion_destino: null,
    reclasificacion_gavetas: "0.00",
    lote_id: 5,
    cliente: {
      id: 10,
      nombre: "Cliente Uno",
      identificacion: "1790011223001",
    },
    lote: {
      id: 5,
      nombre: "Lote A",
      finca: { id: 1, nombre: "Finca Central" },
    },
    creador: { id: 1, nombres: "Alex", apellidos: "Camacho" },
    liquidador: null,
    pagador: null,
    detalles: [],
    created_at: "2026-03-09T10:00:00.000Z",
    updated_at: "2026-03-09T10:00:00.000Z",
    ...overrides,
  };
}

function setupDefaultAvailability({
  exportacionInicial = 20,
  nacionalInicial = 10,
  rechazoInicial = 2,
  entregasExportacion = 0,
  entregasNacional = 0,
  devolucionExportacionANacional = 0,
  devolucionNacionalARechazo = 0,
} = {}) {
  models.Tarea.findAll.mockResolvedValue([
    {
      detalles: {
        clasificacion: {
          exportacion: exportacionInicial,
          nacional: nacionalInicial,
          rechazo: rechazoInicial,
        },
      },
    },
  ]);

  models.Venta.sum.mockImplementation(async (field, { where }) => {
    if (field === "gavetas_entregadas" && where?.tipo_venta === "EXPORTACION") {
      return entregasExportacion;
    }
    if (field === "gavetas_entregadas" && where?.tipo_venta === "NACIONAL") {
      return entregasNacional;
    }
    if (field === "gavetas_devueltas" && where?.tipo_venta === "EXPORTACION") {
      return devolucionExportacionANacional;
    }
    if (field === "gavetas_devueltas" && where?.tipo_venta === "NACIONAL") {
      return devolucionNacionalARechazo;
    }
    return 0;
  });
}

describe("ventas.service v1", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    setupDefaultAvailability();
    models.Cliente.findOne.mockResolvedValue({ id: 10, activo: true });
    models.Lote.findOne.mockResolvedValue({ id: 5, estado: "Activo" });
    models.Lote.findByPk.mockResolvedValue({
      id: 5,
      nombre: "Lote A",
      estado: "Activo",
      finca: { id: 1, nombre: "Finca Central" },
    });
    models.Venta.findOne.mockResolvedValue({ numero_factura: "VTA-000010" });
    models.Venta.create.mockResolvedValue({ id: 101 });
    models.Venta.findByPk.mockResolvedValue(buildVentaDetalleMock());
    models.Venta.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
    models.VentaDetalle.destroy.mockResolvedValue(0);
    models.VentaDetalle.bulkCreate.mockResolvedValue([]);
    notificacionesService.crearParaRoles.mockResolvedValue([]);
  });

  test("crea entrega valida en estado PENDIENTE y notifica", async () => {
    const out = await service.crearEntrega(
      { sub: 7, role: "Tecnico" },
      {
        cliente_id: 10,
        fecha_entrega: "2026-03-09",
        lote_id: 5,
        tipo_venta: "EXPORTACION",
        gavetas_entregadas: 10,
      }
    );

    expect(sequelize.transaction).toHaveBeenCalledTimes(1);
    expect(models.Venta.create).toHaveBeenCalledTimes(1);
    expect(models.Venta.create.mock.calls[0][0]).toMatchObject({
      numero_factura: "VTA-000011",
      estado: "PENDIENTE",
      tipo_venta: "EXPORTACION",
      creado_por: 7,
    });

    expect(notificacionesService.crearParaRoles).toHaveBeenCalledTimes(1);
    expect(notificacionesService.crearParaRoles).toHaveBeenCalledWith(
      ["Propietario", "Tecnico"],
      expect.objectContaining({
        actor_id: 7,
        referencia: expect.objectContaining({
          tipo_evento: "VENTA_ENTREGADA",
          venta_id: 101,
        }),
      })
    );

    expect(out).toMatchObject({
      id: 101,
      numero_factura: "VTA-000011",
      estado: "PENDIENTE",
    });
  });

  test("rechaza entrega cuando excede disponibilidad del lote", async () => {
    setupDefaultAvailability({
      exportacionInicial: 5,
      entregasExportacion: 5,
    });

    await expect(
      service.crearEntrega(
        { sub: 1, role: "Propietario" },
        {
          cliente_id: 10,
          fecha_entrega: "2026-03-09",
          lote_id: 5,
          tipo_venta: "EXPORTACION",
          gavetas_entregadas: 1,
        }
      )
    ).rejects.toMatchObject({ status: 400, code: "BAD_REQUEST" });
  });

  test("registra liquidacion solo con clases validas y recalcula total", async () => {
    const ventaLocked = {
      id: 55,
      tipo_venta: "NACIONAL",
      estado: "PENDIENTE",
      lote_id: 5,
      gavetas_entregadas: "12.00",
      save: jest.fn(),
    };

    models.Venta.findByPk
      .mockResolvedValueOnce(ventaLocked)
      .mockResolvedValueOnce(
        buildVentaDetalleMock({
          id: 55,
          estado: "LIQUIDADA",
          tipo_venta: "NACIONAL",
          numero_recibo: "REC-501",
          subtotal: "27.50",
          total: "27.50",
          gavetas_devueltas: "2.00",
          gavetas_utiles: "10.00",
          reclasificacion_destino: "RECHAZO",
          reclasificacion_gavetas: "2.00",
          detalles: [
            {
              id: 1,
              clase: "primera",
              peso_kg: "10.000",
              precio_unitario: "2.0000",
              subtotal: "20.00",
            },
            {
              id: 2,
              clase: "segunda",
              peso_kg: "5.000",
              precio_unitario: "1.5000",
              subtotal: "7.50",
            },
          ],
        })
      );
    models.Venta.findOne.mockResolvedValueOnce(null);

    const out = await service.registrarLiquidacion(
      { sub: 1, role: "Propietario" },
      55,
      {
        numero_recibo: "rec-501",
        detalles: [
          { clase: "primera", peso_kg: 10, precio_unitario: 2 },
          { clase: "segunda", peso_kg: 5, precio_unitario: 1.5 },
        ],
        gavetas_devueltas: 2,
        gavetas_utiles: 10,
      }
    );

    expect(models.VentaDetalle.bulkCreate).toHaveBeenCalledTimes(1);
    expect(models.VentaDetalle.bulkCreate.mock.calls[0][0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ clase: "primera", subtotal: "20.00" }),
        expect.objectContaining({ clase: "segunda", subtotal: "7.50" }),
      ])
    );

    expect(ventaLocked.estado).toBe("LIQUIDADA");
    expect(ventaLocked.total).toBe("27.50");
    expect(ventaLocked.reclasificacion_destino).toBe("RECHAZO");

    expect(out).toMatchObject({
      id: 55,
      estado: "LIQUIDADA",
      total: 27.5,
      reclasificacion: {
        destino: "RECHAZO",
        gavetas: 2,
      },
    });
  });

  test("rechaza liquidacion con clase invalida para exportacion", async () => {
    models.Venta.findByPk.mockResolvedValueOnce({
      id: 88,
      tipo_venta: "EXPORTACION",
      estado: "PENDIENTE",
      gavetas_entregadas: "4.00",
      save: jest.fn(),
    });

    await expect(
      service.registrarLiquidacion(
        { sub: 1, role: "Propietario" },
        88,
        {
          numero_recibo: "REC-700",
          detalles: [{ clase: "primera", peso_kg: 2, precio_unitario: 3 }],
          gavetas_devueltas: 0,
          gavetas_utiles: 4,
        }
      )
    ).rejects.toMatchObject({ status: 400, code: "BAD_REQUEST" });
  });

  test("solo propietario puede registrar pago y cambia estado a PAGADA", async () => {
    await expect(
      service.registrarPago(
        { sub: 7, role: "Tecnico" },
        10,
        { forma_pago: "EFECTIVO" }
      )
    ).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });

    const ventaLocked = {
      id: 10,
      estado: "LIQUIDADA",
      lote_id: 5,
      save: jest.fn(),
    };

    models.Venta.findByPk
      .mockResolvedValueOnce(ventaLocked)
      .mockResolvedValueOnce(
        buildVentaDetalleMock({
          id: 10,
          estado: "PAGADA",
          tipo_venta: "NACIONAL",
          forma_pago: "TRANSFERENCIA",
          fecha_pago: "2026-03-10",
          total: "120.00",
        })
      );

    const out = await service.registrarPago(
      { sub: 1, role: "Propietario" },
      10,
      {
        forma_pago: "TRANSFERENCIA",
        fecha_pago: "2026-03-10",
        observacion: "Pago completo",
      }
    );

    expect(ventaLocked.estado).toBe("PAGADA");
    expect(ventaLocked.forma_pago).toBe("TRANSFERENCIA");
    expect(out).toMatchObject({
      id: 10,
      estado: "PAGADA",
      forma_pago: "TRANSFERENCIA",
    });
  });

  test("calcula disponibilidad y reclasificacion por lote correctamente", async () => {
    setupDefaultAvailability({
      exportacionInicial: 30,
      nacionalInicial: 20,
      rechazoInicial: 5,
      entregasExportacion: 12,
      entregasNacional: 8,
      devolucionExportacionANacional: 3,
      devolucionNacionalARechazo: 2,
    });

    const out = await service._helpers.calcularDisponibilidadPorLote(5);

    expect(out).toMatchObject({
      exportacion_disponible: 18,
      nacional_disponible: 15,
      rechazo_por_devolucion_comercial: 2,
      rechazo_acumulado: 7,
    });
  });
});
