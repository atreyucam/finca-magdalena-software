// backend/src/modules/tareas/__test__/tareas.verificar-cosecha-force.test.js

jest.mock('../../../db', () => require('./__mocks__/db'));
jest.mock('../../inventario/inventario.service', () => require('./__mocks__/invService'));
jest.mock('../../notificaciones/notificaciones.service', () => require('./__mocks__/notificaciones.service'));

const { models, __resetAll } = require('./__mocks__/db');
const invService = require('./__mocks__/invService');
const notif = require('./__mocks__/notificaciones.service');

const service = require('../tareas.service');

describe('verificarTarea (COSECHA) con force=true', () => {
  beforeEach(() => {
    __resetAll();
    jest.clearAllMocks();
  });

  test('fuerza consumo por LOW_STOCK y normaliza cosecha', async () => {
    const currentUser = { sub: 101, role: 'Tecnico' };
    const tareaId = 42;

    // --- Tarea inicial (estado: Completada) + indicadores válidos ---
    const saveTareaMock = jest.fn().mockResolvedValue(true);
    models.Tarea.findByPk
      // 1) lectura inicial dentro de verificarTarea
      .mockResolvedValueOnce({
        id: tareaId,
        estado: 'Completada',
        lote_id: 7,
        cosecha_id: 3,
        periodo_id: null,
        tipo_id: 77,
        fecha_programada: '2025-02-10',
        descripcion: 'Cosecha lote 7',
        detalles: {
          indicadores: {
            operacion: { kgCosechados: 50, fechaCosecha: '2025-02-10' },
            clasificacion: {
              exportacion: { gabetas: 3, pesoPromGabetaKg: 10 }, // 30 kg
              nacional: { kgEstimados: 15 },                      // 15 kg
            },
            rechazo: { detalle: [{ causa: 'calibre', kg: 5 }] },   // 5 kg
            poscosecha: { cepillado: true, gabetasLlenas: 5, capacidadGabetaKg: 10 }
          }
        },
        TipoActividad: { codigo: 'COSECHA' },
        save: saveTareaMock,
      })
      // 2) lectura final realizada por obtenerTarea()
      .mockResolvedValueOnce({
        id: tareaId,
        estado: 'Verificada',
        TipoActividad: { codigo: 'COSECHA', nombre: 'Cosecha' },
        Lote: { nombre: 'Lote 7' },
        TareaAsignacions: [],
        TareaEstados: [],
        Novedads: [],
        detalles: {}
      });

    // TipoActividad (si tu servicio llega a leerlo aparte en algún camino)
    models.TipoActividad.findByPk.mockResolvedValue({ id: 77, codigo: 'COSECHA' });

    // --- Inventario: simular que NO hay consumo previo ---
    models.InventarioMovimiento.findOne.mockResolvedValue(null);

    // TareaInsumo: 1 insumo que causará LOW_STOCK
    models.TareaInsumo.findAll.mockResolvedValue([{ item_id: 11, cantidad: 10, unidad_id: 1 }]);

    // El _moverStock falla por LOW_STOCK -> activará el "force"
    invService._moverStock.mockRejectedValueOnce(Object.assign(new Error('LOW_STOCK'), { code: 'LOW_STOCK' }));
    invService._getFactor.mockResolvedValue(1);

    // InventarioItem.findByPk:
    //  - 1º llamada: obtener item (antes del intento de moverStock)
    //  - 2º llamada: itemLocked para forzar salida (con save)
    const saveItemLocked = jest.fn().mockResolvedValue(true);
    models.InventarioItem.findByPk
      .mockResolvedValueOnce({ id: 11, unidad_id: 1, stock_actual: '2.000', nombre: 'Insumo X' }) // lectura previa
      .mockResolvedValueOnce({ id: 11, unidad_id: 1, stock_actual: '2.000', save: saveItemLocked }); // locked

    // Reservas
    models.InventarioReserva.update.mockResolvedValue([1]);

    // --- Upserts de cosecha ---
    models.LoteCosecha.findOne.mockResolvedValue(null);
    models.LoteCosecha.create.mockResolvedValue({ id: 900, codigo: 'CO-2025-02-10-L7' });
    models.LoteCosechaClasificacion.destroy.mockResolvedValue(1);
    models.LoteCosechaClasificacion.bulkCreate.mockResolvedValue(true);
    models.LoteCosechaRechazo.destroy.mockResolvedValue(1);
    models.LoteCosechaRechazo.bulkCreate.mockResolvedValue(true);
    models.LoteCosechaPoscosecha.findOne.mockResolvedValue(null);
    models.LoteCosechaPoscosecha.create.mockResolvedValue(true);

    // Logs y notificaciones
    models.TareaEstado.create.mockResolvedValue(true);
    models.TareaAsignacion.findAll.mockResolvedValue([{ usuario_id: 201 }]);
    notif.crear.mockResolvedValue(true);

    // --- Ejecutar ---
    const out = await service.verificarTarea(
      currentUser,
      tareaId,
      { comentario: 'OK', force: true }, // <- 👈 force=true
      null
    );

    // --- Asserts clave ---

    // 1) Se forzó salida de inventario
    expect(invService._moverStock).toHaveBeenCalled(); // intentó normal
    expect(models.InventarioMovimiento.create).toHaveBeenCalledWith(
      expect.objectContaining({
        item_id: 11,
        tipo: 'SALIDA',
        referencia: expect.objectContaining({ tarea_id: tareaId, forced: true }),
      }),
      expect.any(Object)
    );
    // Stock resultante = 2 - 10 = -8.000
    const movArgs = models.InventarioMovimiento.create.mock.calls[0][0];
    expect(Number(movArgs.stock_resultante)).toBeCloseTo(-8, 3);// puede venir como string sin toFixed en mock; acepta '-8' o '-8.000'
    // y se guardó el itemLocked
    expect(saveItemLocked).toHaveBeenCalled();

    // 2) Se generó lote de cosecha y clasificaciones
    expect(models.LoteCosecha.create).toHaveBeenCalledWith(
      expect.objectContaining({
        codigo: 'CO-2025-02-10-L7',
        kg_cosechados: 50
      }),
      expect.any(Object)
    );
    expect(models.LoteCosechaClasificacion.bulkCreate).toHaveBeenCalled();
    expect(models.LoteCosechaRechazo.bulkCreate).toHaveBeenCalledWith(
      [ expect.objectContaining({ causa: 'Calibre' /* mapeo podría ser 'Calibre' o 'Calibre' -> según tu map */ }) ],
      expect.any(Object)
    );

    // 3) Estado final
    expect(out.estado).toBe('Verificada');
    expect(models.TareaEstado.create).toHaveBeenCalledWith(
      expect.objectContaining({ estado: 'Verificada', tarea_id: tareaId }),
      expect.any(Object)
    );
    // Notificación a asignados
    expect(notif.crear).toHaveBeenCalledTimes(1);
  });
});
