// src/modules/tareas/__test__/tareas.indicadores-nocosecha.test.js

jest.mock('../../../db', () => require('./__mocks__/db')); // modelos/tx mock
jest.mock('../../inventario/inventario.service', () => require('./__mocks__/invService'));
jest.mock('../../notificaciones/notificaciones.service', () => require('./__mocks__/notificaciones.service'));

// 🔧 Mockeamos el helper para controlar validación y resumen:
jest.mock('../indicadores.helper', () => ({
  validateIndicadores: jest.fn(),
  buildResumen: jest.fn(),
  resumenKey: jest.fn(),
}));

const { __resetAll, models } = require('./__mocks__/db');
const notif = require('./__mocks__/notificaciones.service');
const { validateIndicadores, buildResumen, resumenKey } = require('../indicadores.helper');

const service = require('../tareas.service');

describe('Indicadores NO-COSECHA', () => {
  beforeEach(() => {
    __resetAll();
    jest.clearAllMocks();
  });

  test('completarTarea("PODA") guarda indicadores y resumen en detalles', async () => {
    const currentUser = { sub: 10, role: 'Tecnico' };
    const tareaId = 123;

    // 1) primera búsqueda (edición + save indicadores)
    const saveMock = jest.fn().mockResolvedValue(true);
    models.Tarea.findByPk
      .mockResolvedValueOnce({
        id: tareaId,
        estado: 'En progreso',
        detalles: {},
        save: saveMock,
        TipoActividad: { codigo: 'PODA' },
      })
      // 2) segunda búsqueda (obtenerTarea para respuesta)
      .mockResolvedValueOnce({
        id: tareaId,
        estado: 'Completada',
        TipoActividad: { codigo: 'PODA', nombre: 'Poda' },
        Lote: {},
        TareaAsignacions: [],
        TareaEstados: [],
        Novedads: [],
      });

    models.TareaEstado.create.mockResolvedValue({});
    notif.crearParaRoles.mockResolvedValue(true);

    // Mock del helper (camino feliz)
    const incoming = { tipo: 'formacion', plantasIntervenidas: 25, notas: 'ok' };
    const parsed = { tipo: 'formacion', plantas: 25, obs: 'ok' };
    validateIndicadores.mockReturnValue(parsed);
    buildResumen.mockReturnValue({ plantas: 25, tipo: 'formacion' });
    resumenKey.mockReturnValue('resumen_poda');

    const body = { comentario: 'Listo', indicadores: incoming };

    const out = await service.completarTarea(currentUser, tareaId, body, null);

    // validaciones clave
    expect(validateIndicadores).toHaveBeenCalledWith('PODA', incoming);
    expect(buildResumen).toHaveBeenCalledWith('PODA', parsed);
    expect(resumenKey).toHaveBeenCalledWith('PODA');

    // se guardó dos veces (1: indicadores/resumen, 2: cambio a Completada)
    expect(saveMock).toHaveBeenCalled();

    // se generó el estado "Completada"
    expect(models.TareaEstado.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tarea_id: tareaId,
        estado: 'Completada',
      }),
      expect.any(Object)
    );

    expect(out.estado).toBe('Completada');
  });

  test('completarTarea("PODA") con indicadores inválidos → BAD_INDICADORES', async () => {
    const currentUser = { sub: 10, role: 'Tecnico' };
    const tareaId = 124;

    models.Tarea.findByPk.mockResolvedValueOnce({
      id: tareaId,
      estado: 'En progreso',
      detalles: {},
      save: jest.fn(),
      TipoActividad: { codigo: 'PODA' },
    });

    // Fuerza error de validación
    validateIndicadores.mockImplementation(() => {
      throw new Error('faltan campos requeridos');
    });

    const body = { comentario: 'x', indicadores: { plantasIntervenidas: 'NaN' } };

    await expect(service.completarTarea(currentUser, tareaId, body, null))
      .rejects.toMatchObject({ code: 'BAD_INDICADORES' });

    // No debería loguear "Completada" si falla validación
    expect(models.TareaEstado.create).not.toHaveBeenCalled();
  });
});
