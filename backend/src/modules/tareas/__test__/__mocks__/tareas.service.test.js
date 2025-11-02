jest.mock('../../../../db', () => require('./db'));
jest.mock('../../../inventario/inventario.service', () => require('./invService'));
jest.mock('../../../notificaciones/notificaciones.service', () => require('./notificaciones.service'));

const { models, __resetAll } = require('./db');
const notif = require('./notificaciones.service');
const service = require('../../tareas.service');

describe('tareas.service', () => {
  beforeEach(() => {
    __resetAll();
    jest.clearAllMocks();
  });

  describe('crearTarea', () => {
    it('crea tarea con asignaciones iniciales', async () => {
      const currentUser = { sub: 100, role: 'Tecnico' };
      const body = {
        tipo_codigo: 'PODA',
        lote_id: 1,
        cosecha_id: 10,
        fecha_programada: '2025-01-10',
        asignados: [200, 201],
      };

      models.TipoActividad.findOne.mockResolvedValue({ id: 5, codigo: 'PODA', nombre: 'Poda' });
      models.TipoActividad.findByPk?.mockResolvedValue?.({ nombre: 'Poda', codigo: 'PODA' }); // por si el servicio lo usa
      models.Lote.findByPk.mockResolvedValue({ id: 1 });
      models.Cosecha.findByPk.mockResolvedValue({ id: 10, estado: 'Activa' });
      models.Usuario.findAll.mockResolvedValue([{ id: 200 }, { id: 201 }]);

      models.Tarea.create.mockResolvedValue({
        id: 999,
        estado: 'Pendiente',
        fecha_programada: '2025-01-10',
        save: jest.fn().mockResolvedValue(true),
      });

      models.TareaAsignacion.bulkCreate.mockResolvedValue(true);
      models.TareaEstado.create.mockResolvedValue(true);

      models.Tarea.findByPk.mockResolvedValue({
        id: 999,
        TipoActividad: { codigo: 'PODA', nombre: 'Poda' },
        Lote: { nombre: 'Lote 1' },
        TareaAsignacions: [{ usuario_id: 200 }, { usuario_id: 201 }],
        TareaEstados: [],
        Novedads: [],
        Creador: { id: 100, nombres: 'Tec', apellidos: 'Nico' },
        Cosecha: { nombre: 'Cosecha 1' },
        PeriodoCosecha: null,
        detalles: {},
        estado: 'Asignada',
        lote_id: 1,
        fecha_programada: '2025-01-10',
      });

      const out = await service.crearTarea(currentUser, body, null);

      expect(models.Tarea.create).toHaveBeenCalled();
      expect(models.TareaAsignacion.bulkCreate).toHaveBeenCalled();
      expect(out.id).toBe(999);
      expect(out.estado).toBe('Asignada');
    });
  });

  describe('iniciarTarea', () => {
    it('trabajador asignado inicia', async () => {
      const currentUser = { sub: 200, role: 'Trabajador' };

      models.TareaAsignacion.findOne.mockResolvedValue({ id: 1 });

      // 1) para cambiar estado (con save)
      // 2) para devolver la tarea (con asignación del trabajador) -> evita FORBIDDEN en obtenerTarea()
      models.Tarea.findByPk
        .mockResolvedValueOnce({ id: 1, estado: 'Asignada', save: jest.fn().mockResolvedValue(true) })
        .mockResolvedValueOnce({
          id: 1,
          estado: 'En progreso',
          TipoActividad: {},
          Lote: {},
          TareaAsignacions: [{ usuario_id: 200 }], // ✅ importante
          TareaEstados: [],
          Novedads: [],
        });

      models.TareaEstado.create.mockResolvedValue({});

      const out = await service.iniciarTarea(currentUser, 1, 'Arrancando', null);
      expect(out.estado).toBe('En progreso');
      expect(models.TareaEstado.create).toHaveBeenCalled();
    });
  });

  describe('completarTarea', () => {
    it('técnico completa', async () => {
      const currentUser = { sub: 100, role: 'Tecnico' };

      models.Tarea.findByPk
        .mockResolvedValueOnce({ id: 2, estado: 'En progreso', save: jest.fn().mockResolvedValue(true) })
        .mockResolvedValueOnce({
          id: 2,
          estado: 'Completada',
          TipoActividad: {},
          Lote: {},
          TareaAsignacions: [],
          TareaEstados: [],
          Novedads: [],
        });

      models.TareaEstado.create.mockResolvedValue({});

      const out = await service.completarTarea(currentUser, 2, 'Listo', null);
      expect(out.estado).toBe('Completada');
      expect(models.TareaEstado.create).toHaveBeenCalled();
    });
  });

  describe('verificarTarea (COSECHA)', () => {
    it('normaliza indicadores de cosecha y verifica', async () => {
      const currentUser = { sub: 100, role: 'Tecnico' };
      const tareaId = 5;

      // 1) tarea con TipoActividad COSECHA (y save)
      // 2) respuesta final
      models.Tarea.findByPk
        .mockResolvedValueOnce({
          id: tareaId,
          estado: 'Completada',
          lote_id: 1,
          cosecha_id: 10,
          periodo_id: null,
          tipo_id: 77,
          fecha_programada: '2025-02-02',
          descripcion: 'Cosecha del lote 1',
          save: jest.fn().mockResolvedValue(true),
          TipoActividad: { codigo: 'COSECHA' }, // ✅ necesario para entrar al branch
          detalles: {
            indicadores: {
              operacion: { kgCosechados: 120, fechaCosecha: '2025-02-03' },
              clasificacion: {
                exportacion: { gabetas: 6, pesoPromGabetaKg: 10 },
                nacional: { kgEstimados: 40 },
              },
              rechazo: { detalle: [{ causa: 'daño mecánico', kg: 20 }] },
              poscosecha: { cepillado: true, clasificacion: true, gabetasLlenas: 10, capacidadGabetaKg: 10 },
            },
          },
        })
        .mockResolvedValueOnce({
          id: tareaId,
          estado: 'Verificada',
          TipoActividad: { nombre: 'Cosecha', codigo: 'COSECHA' },
          Lote: { nombre: 'Lote 1' },
          TareaAsignacions: [],
          TareaEstados: [],
          Novedads: [],
        });

      models.TipoActividad.findByPk.mockResolvedValue({ id: 77, codigo: 'COSECHA' });
      models.InventarioMovimiento.findOne.mockResolvedValue(null);
      models.TareaInsumo.findAll.mockResolvedValue([]);
      models.InventarioReserva.update.mockResolvedValue([1]);

      models.LoteCosecha.findOne.mockResolvedValue(null);
      models.LoteCosecha.create.mockResolvedValue({ id: 500, codigo: 'CO-2025-02-03-L1' });
      models.LoteCosechaClasificacion.destroy.mockResolvedValue(1);
      models.LoteCosechaClasificacion.bulkCreate.mockResolvedValue(true);
      models.LoteCosechaRechazo.destroy.mockResolvedValue(1);
      models.LoteCosechaRechazo.bulkCreate.mockResolvedValue(true);
      models.LoteCosechaPoscosecha.findOne.mockResolvedValue(null);
      models.LoteCosechaPoscosecha.create.mockResolvedValue(true);

      models.TareaEstado.create.mockResolvedValue(true);
      models.TareaAsignacion.findAll.mockResolvedValue([{ usuario_id: 200 }, { usuario_id: 201 }]);

      const out = await service.verificarTarea(currentUser, tareaId, { comentario: 'OK' }, null);

      expect(models.LoteCosecha.create).toHaveBeenCalledWith(
        expect.objectContaining({ codigo: 'CO-2025-02-03-L1', kg_cosechados: 120 }),
        expect.any(Object)
      );
      expect(models.LoteCosechaClasificacion.bulkCreate).toHaveBeenCalled();
      expect(models.LoteCosechaRechazo.bulkCreate).toHaveBeenCalledWith(
        [expect.objectContaining({ causa: 'DanoMecanico', kg: 20 })],
        expect.any(Object)
      );
      expect(out.estado).toBe('Verificada');
      expect(notif.crear).toHaveBeenCalledTimes(2);
    });

    it('falla si no cierra masa', async () => {
      const currentUser = { sub: 100, role: 'Tecnico' };
      const tareaId = 6;

      models.Tarea.findByPk.mockResolvedValue({
        id: tareaId,
        estado: 'Completada',
        lote_id: 1,
        cosecha_id: 10,
        tipo_id: 77,
        fecha_programada: '2025-02-02',
        save: jest.fn().mockResolvedValue(true),        // por si la función intenta save
        TipoActividad: { codigo: 'COSECHA' },           // ✅ asegurar que entra al branch de cosecha
        detalles: {
          indicadores: {
            operacion: { kgCosechados: 100 },
            clasificacion: { exportacion: { kgEstimados: 50 }, nacional: { kgEstimados: 40 } },
            rechazo: { detalle: [{ causa: 'plaga', kg: 20 }] }, // 110 > 100 => BAD_REQUEST
          },
        },
      });

      models.TipoActividad.findByPk.mockResolvedValue({ id: 77, codigo: 'COSECHA' });
      models.InventarioMovimiento.findOne.mockResolvedValue(null);
      models.TareaInsumo.findAll.mockResolvedValue([]);
      models.InventarioReserva.update.mockResolvedValue([1]);

      await expect(service.verificarTarea(currentUser, tareaId, {}, null))
        .rejects.toMatchObject({ code: 'BAD_REQUEST' });
    });
  });

  describe('configurarInsumos', () => {
    it('reemplaza insumos y reservas', async () => {
      const currentUser = { sub: 1, role: 'Tecnico' };
      const tareaId = 9;

      models.Tarea.findByPk.mockResolvedValue({ id: tareaId, estado: 'Asignada' });
      models.InventarioItem.findByPk.mockResolvedValue({ id: 1, unidad_id: 1, categoria: 'Insumo' });
      models.Unidad = {
        findByPk: jest.fn().mockResolvedValue({ id: 1, codigo: 'kg' }),
        findOne: jest.fn().mockResolvedValue({ id: 1, codigo: 'kg' }),
      };

      const body = { insumos: [{ item_id: 1, cantidad: 5, unidad_codigo: 'kg' }] };
      models.TareaInsumo.destroy.mockResolvedValue(1);
      models.TareaInsumo.bulkCreate.mockResolvedValue(true);
      models.InventarioReserva.update.mockResolvedValue([1]);
      models.InventarioReserva.bulkCreate.mockResolvedValue(true);
      models.TareaEstado.create.mockResolvedValue(true);

      models.Tarea.findByPk.mockResolvedValueOnce({
        id: tareaId,
        TipoActividad: {},
        Lote: {},
        Creador: {},
        TareaAsignacions: [],
        TareaEstados: [],
        Novedads: [],
        Cosecha: null,
        PeriodoCosecha: null,
        TareaRequerimientos: [],
        TareaInsumos: [],
      });

      const out = await service.configurarInsumos(currentUser, tareaId, body, null);
      expect(models.TareaInsumo.bulkCreate).toHaveBeenCalled();
      expect(models.InventarioReserva.bulkCreate).toHaveBeenCalled();
      expect(out.id).toBe(tareaId);
    });
  });
});
