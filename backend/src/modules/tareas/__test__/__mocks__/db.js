// backend/src/modules/tareas/__tests__/__mocks__/db.js
const makeModel = () => ({
  create: jest.fn(),
  bulkCreate: jest.fn(),
  findByPk: jest.fn(),
  findOne: jest.fn(),
  findAll: jest.fn(),
  findAndCountAll: jest.fn(),
  update: jest.fn(),
  destroy: jest.fn(),
  belongsTo: jest.fn(), hasMany: jest.fn()
});

const models = {
  // existentes
  Tarea: makeModel(),
  TareaAsignacion: makeModel(),
  TareaEstado: makeModel(),
  TareaInsumo: makeModel(),
  TareaRequerimiento: makeModel(),
  InventarioReserva: makeModel(),
  InventarioItem: makeModel(),
  InventarioMovimiento: makeModel(),
  TipoActividad: makeModel(),
  Lote: makeModel(),
  Cosecha: makeModel(),
  PeriodoCosecha: makeModel(),
  Usuario: makeModel(),
  // cosecha normalizada (si ya los creaste en tu codebase real)
  LoteCosecha: makeModel(),
  LoteCosechaClasificacion: makeModel(),
  LoteCosechaRechazo: makeModel(),
  LoteCosechaPoscosecha: makeModel(),
};

const sequelize = {
  transaction: async (cb) => {
    // transacción fake: pasa un objeto t con LOCK para tests
    const t = { LOCK: { UPDATE: 'UPDATE' } };
    return cb(t);
  }
};

module.exports = {
  models,
  sequelize,
  __resetAll: () => {
    for (const m of Object.values(models)) {
      for (const fn of Object.values(m)) {
        if (typeof fn?.mockReset === 'function') fn.mockReset();
      }
    }
  }
};
