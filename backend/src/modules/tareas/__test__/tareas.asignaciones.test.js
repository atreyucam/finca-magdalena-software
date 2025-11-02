// src/modules/tareas/__test__/tareas.asignaciones.test.js
jest.mock('../../../db', () => require('./__mocks__/db'));
jest.mock('../../inventario/inventario.service', () => require('./__mocks__/invService'));
jest.mock('../../notificaciones/notificaciones.service', () => require('./__mocks__/notificaciones.service'));

const { __resetAll, models } = require('./__mocks__/db');
const service = require('../tareas.service');

describe('actualizarAsignaciones', () => {
  beforeEach(() => {
    __resetAll();
    jest.clearAllMocks();
  });

  test('hace diff (agrega y elimina) + cambia estado Pendiente→Asignada + registra actividad', async () => {
    const currentUser = { sub: 1, role: 'Tecnico' };
    const tareaId = 70;

    // Tarea con 1 asignado (300), estado Pendiente
    models.Tarea.findByPk.mockResolvedValue({
      id: tareaId,
      estado: 'Pendiente',
      save: jest.fn().mockResolvedValue(true),
      TareaAsignacions: [{ usuario_id: 300, Usuario: { id: 300, nombres: 'Ana', apellidos: 'Z' } }],
    });

    // Usuarios activos: queremos dejar [301,302] → agrega 301,302 y elimina 300
    models.Usuario.findAll
      .mockResolvedValueOnce([{ id: 301, nombres: 'Luis', apellidos: 'A' }, { id: 302, nombres: 'Mar', apellidos: 'B' }]) // validación activos
      .mockResolvedValueOnce([{ nombres: 'Ana', apellidos: 'Z' }])  // detalle eliminados (300)
      .mockResolvedValueOnce([{ nombres: 'Luis', apellidos: 'A' }, { nombres: 'Mar', apellidos: 'B' }]); // detalle agregados

    models.TareaAsignacion.destroy.mockResolvedValue(1);
    models.TareaAsignacion.bulkCreate.mockResolvedValue(true);
    models.TareaEstado.create.mockResolvedValue(true);

models.Tarea.findByPk
  // 1) carga inicial (tiene usuario_id para calcular diffs)
  .mockResolvedValueOnce({
    id: tareaId,
    estado: 'Pendiente',
    save: jest.fn().mockResolvedValue(true),
    TareaAsignacions: [{ usuario_id: 300, Usuario: { id: 300, nombres: 'Ana', apellidos: 'Z' } }],
  })
  // 2) respuesta final de obtenerTarea (ya mapeada a usuarios nuevos)
  .mockResolvedValueOnce({
    id: tareaId,
    estado: 'Asignada',
    TipoActividad: {},
    Lote: {},
    Creador: {},
    TareaAsignacions: [
      { Usuario: { id: 301, nombres: 'Luis', apellidos: 'A' } },
      { Usuario: { id: 302, nombres: 'Mar', apellidos: 'B' } },
    ],
    TareaEstados: [],
    Novedads: [],
    Cosecha: null,
    PeriodoCosecha: null,
    TareaRequerimientos: [],
    TareaInsumos: [],
  });


    const out = await service.actualizarAsignaciones(currentUser, tareaId, { usuarios: [301, 302] }, null);

    // se eliminaron antiguos
    expect(models.TareaAsignacion.destroy).toHaveBeenCalledWith({
      where: { tarea_id: tareaId, usuario_id: [300] },
    });

    // se agregaron nuevos
    expect(models.TareaAsignacion.bulkCreate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ tarea_id: tareaId, usuario_id: 301 }),
        expect.objectContaining({ tarea_id: tareaId, usuario_id: 302 }),
      ]),
      expect.any(Object)
    );

    // estado pasó a Asignada y se registró actividad
    expect(out.estado).toBe('Asignada');
    expect(models.TareaEstado.create).toHaveBeenCalled();
  });

  test('valida usuarios inválidos/inactivos', async () => {
    const currentUser = { sub: 1, role: 'Tecnico' };
    const tareaId = 71;

    models.Tarea.findByPk.mockResolvedValue({ id: tareaId, estado: 'Asignada', TareaAsignacions: [] });
    // ninguno “activo”
    models.Usuario.findAll.mockResolvedValueOnce([]);

    await expect(service.actualizarAsignaciones(currentUser, tareaId, { usuarios: [999] }, null))
      .rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });
});
