// backend/src/modules/tareas/__tests__/tareas.controller.test.js
jest.mock('../../tareas.service.js', () => ({
  crearTarea: jest.fn(),
  asignarUsuarios: jest.fn(),
  iniciarTarea: jest.fn(),
  completarTarea: jest.fn(),
  verificarTarea: jest.fn(),
  crearNovedad: jest.fn(),
  listarNovedades: jest.fn(),
  listarTareas: jest.fn(),
  obtenerTarea: jest.fn(),
  configurarInsumos: jest.fn(),
  listarInsumos: jest.fn(),
  actualizarAsignaciones: jest.fn(),
  configurarRequerimientos: jest.fn(),
  listarRequerimientosTarea: jest.fn(),
}));

const controller = require('../../tareas.controller');
const service = require('../../tareas.service');

const res = () => {
  const r = {};
  r.status = jest.fn().mockReturnValue(r);
  r.json = jest.fn().mockReturnValue(r);
  return r;
};

describe('tareas.controller', () => {
  it('crearTarea -> 201', async () => {
    const req = { user: { sub: 1 }, body: { /* ... */ }, app: { get: () => null } };
    const r = res();
    service.crearTarea.mockResolvedValue({ id: 10 });
    await controller.crearTarea(req, r, jest.fn());
    expect(r.status).toHaveBeenCalledWith(201);
    expect(r.json).toHaveBeenCalledWith({ id: 10 });
  });

  it('verificarTarea -> 200', async () => {
    const req = { user: { role: 'Tecnico', sub: 1 }, params: { id: '5' }, body: {}, app: { get: () => null } };
    const r = res();
    service.verificarTarea.mockResolvedValue({ id: 5, estado: 'Verificada' });
    await controller.verificarTarea(req, r, jest.fn());
    expect(r.json).toHaveBeenCalledWith({ id: 5, estado: 'Verificada' });
  });

  it('listarTareas -> 200', async () => {
    const req = { user: { role: 'Tecnico' }, query: { page: '1', pageSize: '10' } };
    const r = res();
    service.listarTareas.mockResolvedValue({ total: 0, data: [] });
    await controller.listarTareas(req, r, jest.fn());
    expect(r.json).toHaveBeenCalledWith({ total: 0, data: [] });
  });
});
