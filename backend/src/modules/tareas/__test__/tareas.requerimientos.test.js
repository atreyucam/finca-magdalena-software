// src/modules/tareas/__test__/tareas.requerimientos.test.js
jest.mock('../../../db', () => require('./__mocks__/db'));
jest.mock('../../inventario/inventario.service', () => require('./__mocks__/invService'));
jest.mock('../../notificaciones/notificaciones.service', () => require('./__mocks__/notificaciones.service'));

const { __resetAll, models } = require('./__mocks__/db');
const invService = require('./__mocks__/invService');

const service = require('../tareas.service');

describe('configurarRequerimientos', () => {
  beforeEach(() => {
    __resetAll();
    jest.clearAllMocks();
  });

  test('reemplaza requerimientos y reservas + registra actividad', async () => {
    const currentUser = { sub: 10, role: 'Tecnico' };
    const tareaId = 55;

    // tarea abierta
    models.Tarea.findByPk.mockResolvedValue({ id: tareaId, estado: 'Asignada' });

    // ítems válidos
    models.InventarioItem.findByPk
      .mockResolvedValueOnce({ id: 1, unidad_id: 1, categoria: 'Herramienta' })
      .mockResolvedValueOnce({ id: 2, unidad_id: 1, categoria: 'Equipo' });

    // unidades
    models.Unidad = {
      findByPk: jest.fn().mockResolvedValue({ id: 1, codigo: 'unidad' }),
      findOne: jest.fn().mockResolvedValue({ id: 1, codigo: 'unidad' }),
    };

    // factor 1:1
    invService._getFactor.mockResolvedValue(1);

    // mocks de escritura
    models.TareaRequerimiento.destroy.mockResolvedValue(2);
    models.TareaRequerimiento.bulkCreate.mockResolvedValue(true);
    models.InventarioReserva.update.mockResolvedValue([2]);
    models.InventarioReserva.bulkCreate.mockResolvedValue(true);
    models.TareaEstado.create.mockResolvedValue(true);

 models.Tarea.findByPk
  // 1) carga inicial dentro de configurarRequerimientos
  .mockResolvedValueOnce({ id: tareaId, estado: 'Asignada' })
  // 2) respuesta de obtenerTarea (con TareaRequerimientos poblado)
  .mockResolvedValueOnce({
    id: tareaId,
    TipoActividad: {},
    Lote: {},
    Creador: {},
    TareaAsignacions: [],
    TareaEstados: [],
    Novedads: [],
    Cosecha: null,
    PeriodoCosecha: null,
    TareaRequerimientos: [
      { id: 10, item_id: 1, cantidad: 2, categoria: 'Herramienta', InventarioItem: { nombre: 'Machete', categoria: 'Herramienta' }, Unidad: { codigo: 'unidad' } },
      { id: 11, item_id: 2, cantidad: 1, categoria: 'Equipo',      InventarioItem: { nombre: 'Motoguadaña', categoria: 'Equipo' },   Unidad: { codigo: 'unidad' } },
    ],
    TareaInsumos: [],
  });


    const body = {
      requerimientos: [
        { item_id: 1, cantidad: 2, unidad_codigo: 'unidad', categoria: 'Herramienta' },
        { item_id: 2, cantidad: 1, unidad_codigo: 'unidad', categoria: 'Equipo' },
      ]
    };

    const out = await service.configurarRequerimientos(currentUser, tareaId, body, /*io*/ null);

    expect(models.TareaRequerimiento.destroy).toHaveBeenCalledWith({ where: { tarea_id: tareaId } , transaction: expect.any(Object) });
    expect(models.TareaRequerimiento.bulkCreate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ tarea_id: tareaId, item_id: 1, cantidad: 2, categoria: 'Herramienta' }),
        expect.objectContaining({ tarea_id: tareaId, item_id: 2, cantidad: 1, categoria: 'Equipo' }),
      ]),
      expect.any(Object)
    );
    expect(models.InventarioReserva.update).toHaveBeenCalled();
    expect(models.InventarioReserva.bulkCreate).toHaveBeenCalled();
    expect(models.TareaEstado.create).toHaveBeenCalled();

    expect(out.id).toBe(tareaId);
    expect(out.requerimientos).toHaveLength(2);
  });

  test('valida que categoria sea Herramienta|Equipo', async () => {
    const currentUser = { sub: 10, role: 'Tecnico' };
    const tareaId = 56;

    models.Tarea.findByPk.mockResolvedValue({ id: tareaId, estado: 'Asignada' });
    models.InventarioItem.findByPk.mockResolvedValue({ id: 99, unidad_id: 1, categoria: 'Equipo' });
    models.Unidad = { findOne: jest.fn().mockResolvedValue({ id: 1, codigo: 'unidad' }), findByPk: jest.fn() };
    const body = { requerimientos: [{ item_id: 99, cantidad: 1, unidad_codigo: 'unidad', categoria: 'X' }] };

    await expect(service.configurarRequerimientos(currentUser, tareaId, body, null))
      .rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });
});
