// backend/src/db/index.js
const { Sequelize } = require('sequelize');
const { config } = require('../config/env');

// ===== Models Imports =====
// Core & Usuarios
const RoleModel                 = require('./models/role');
const UsuarioModel              = require('./models/usuario');
const NotificacionModel         = require('./models/notificacion');

// Gestión Agronómica (Contexto)
const LoteModel                 = require('./models/lote');
const CosechaModel              = require('./models/cosecha');
const PeriodoCosechaModel       = require('./models/periodoCosecha');
const TipoActividadModel        = require('./models/tipoActividad');

// Tareas (El núcleo unificado)
const TareaModel                = require('./models/tarea');
const TareaAsignacionModel      = require('./models/tareaAsignacion');
const TareaEstadoModel          = require('./models/tareaEstado');
const TareaItemModel            = require('./models/tareaItems');
const NovedadModel              = require('./models/novedad');

// Inventario (Optimizado: 4 Modelos)
const UnidadModel               = require('./models/unidad');
const InventarioItemModel       = require('./models/inventarioItem');
const InventarioLoteModel       = require('./models/inventarioLote');
const InventarioMovimientoModel = require('./models/inventarioMovimiento');
const HerramientaPrestamoModel  = require('./models/herramientaPrestamo');

// Pagos
const NominaSemanaModel         = require('./models/nominaSemana');
const NominaDetalleModel        = require('./models/nominaDetalle');


const FincaModel = require('./models/finca');

// ===== Sequelize Instance =====
const sequelize = new Sequelize(
  config.db.name,
  config.db.user,
  config.db.pass,
  {
    host: config.db.host,
    port: config.db.port,
    dialect: 'postgres',
    logging: config.env === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// ===== Init Models =====
const models = {};
models.Sequelize = Sequelize;

// 1. Instanciar Modelos
models.Role = RoleModel(sequelize);
models.Usuario = UsuarioModel(sequelize);
models.Notificacion = NotificacionModel(sequelize);

models.Lote = LoteModel(sequelize);
models.Cosecha = CosechaModel(sequelize);
models.PeriodoCosecha = PeriodoCosechaModel(sequelize);
models.TipoActividad = TipoActividadModel(sequelize);

models.Tarea = TareaModel(sequelize);
models.TareaAsignacion = TareaAsignacionModel(sequelize);
models.TareaEstado = TareaEstadoModel(sequelize);
models.TareaItem = TareaItemModel(sequelize);
models.Novedad = NovedadModel(sequelize);

models.Unidad = UnidadModel(sequelize);
models.InventarioItem = InventarioItemModel(sequelize);
models.InventarioLote = InventarioLoteModel(sequelize);
models.InventarioMovimiento = InventarioMovimientoModel(sequelize);
models.HerramientaPrestamo = HerramientaPrestamoModel(sequelize);

models.NominaSemana = NominaSemanaModel(sequelize);
models.NominaDetalle = NominaDetalleModel(sequelize);
models.Finca = FincaModel(sequelize);


// 2. Definir Asociaciones

// --- Usuarios & Roles ---
models.Role.hasMany(models.Usuario, { foreignKey: 'role_id' });
models.Usuario.belongsTo(models.Role, { foreignKey: 'role_id' });

// --- Notificaciones ---
models.Usuario.hasMany(models.Notificacion, { foreignKey: 'usuario_id', as: 'notificaciones' });
models.Notificacion.belongsTo(models.Usuario, { foreignKey: 'usuario_id', as: 'usuario' });

// --- Contexto Agrícola (Cosechas/Lotes) ---
models.Cosecha.hasMany(models.PeriodoCosecha, { foreignKey: 'cosecha_id' });
models.PeriodoCosecha.belongsTo(models.Cosecha, { foreignKey: 'cosecha_id' });

models.Cosecha.hasMany(models.Tarea, { foreignKey: 'cosecha_id' });
models.Tarea.belongsTo(models.Cosecha, { foreignKey: 'cosecha_id' });

models.PeriodoCosecha.hasMany(models.Tarea, { foreignKey: 'periodo_id' });
models.Tarea.belongsTo(models.PeriodoCosecha, { foreignKey: 'periodo_id' });

models.Lote.hasMany(models.Tarea, { foreignKey: 'lote_id' });
models.Tarea.belongsTo(models.Lote, { foreignKey: 'lote_id' });

// --- Tareas (Core) ---
models.TipoActividad.hasMany(models.Tarea, { foreignKey: 'tipo_id' });
models.Tarea.belongsTo(models.TipoActividad, { foreignKey: 'tipo_id' });

models.Usuario.hasMany(models.Tarea, { as: 'TareasCreadas', foreignKey: 'creador_id' });
models.Tarea.belongsTo(models.Usuario, { as: 'Creador', foreignKey: 'creador_id' });

// Asignaciones (M:N explícita)
models.Tarea.hasMany(models.TareaAsignacion, { foreignKey: 'tarea_id', onDelete: 'CASCADE' });
models.TareaAsignacion.belongsTo(models.Tarea, { foreignKey: 'tarea_id' });
models.Usuario.hasMany(models.TareaAsignacion, { foreignKey: 'usuario_id' });
models.TareaAsignacion.belongsTo(models.Usuario, { foreignKey: 'usuario_id' });

// Estados (Traza de auditoría)
models.Tarea.hasMany(models.TareaEstado, { foreignKey: 'tarea_id', onDelete: 'CASCADE' });
models.TareaEstado.belongsTo(models.Tarea, { foreignKey: 'tarea_id' });
models.Usuario.hasMany(models.TareaEstado, { foreignKey: 'usuario_id' });
models.TareaEstado.belongsTo(models.Usuario, { foreignKey: 'usuario_id' });

// Novedades
models.Tarea.hasMany(models.Novedad, { foreignKey: 'tarea_id', onDelete: 'CASCADE' });
models.Novedad.belongsTo(models.Tarea, { foreignKey: 'tarea_id' });
models.Usuario.hasMany(models.Novedad, { foreignKey: 'autor_id' });
models.Novedad.belongsTo(models.Usuario, { foreignKey: 'autor_id' });

// Tarea Items (Consumo de recursos en tareas)
models.Tarea.hasMany(models.TareaItem, { foreignKey: 'tarea_id', onDelete: 'CASCADE' });
models.TareaItem.belongsTo(models.Tarea, { foreignKey: 'tarea_id' });
models.InventarioItem.hasMany(models.TareaItem, { foreignKey: 'item_id' });
models.TareaItem.belongsTo(models.InventarioItem, { foreignKey: 'item_id' });
models.Unidad.hasMany(models.TareaItem, { foreignKey: 'unidad_id' });
models.TareaItem.belongsTo(models.Unidad, { foreignKey: 'unidad_id' });

// --- Inventario ---
models.Unidad.hasMany(models.InventarioItem, { foreignKey: 'unidad_id' });
models.InventarioItem.belongsTo(models.Unidad, { foreignKey: 'unidad_id' });

// Lotes (Trazabilidad FEFO)
models.InventarioItem.hasMany(models.InventarioLote, { foreignKey: 'item_id', as: 'Lotes' });
models.InventarioLote.belongsTo(models.InventarioItem, { foreignKey: 'item_id' });

// Movimientos
models.InventarioItem.hasMany(models.InventarioMovimiento, { foreignKey: 'item_id' });
models.InventarioMovimiento.belongsTo(models.InventarioItem, { foreignKey: 'item_id' });
models.Unidad.hasMany(models.InventarioMovimiento, { foreignKey: 'unidad_id' });
models.InventarioMovimiento.belongsTo(models.Unidad, { foreignKey: 'unidad_id' });
models.InventarioLote.hasMany(models.InventarioMovimiento, { foreignKey: 'lote_id' });
models.InventarioMovimiento.belongsTo(models.InventarioLote, { foreignKey: 'lote_id' });

// Préstamos
models.InventarioItem.hasMany(models.HerramientaPrestamo, { foreignKey: 'item_id' });
models.HerramientaPrestamo.belongsTo(models.InventarioItem, { foreignKey: 'item_id' });
models.Usuario.hasMany(models.HerramientaPrestamo, { foreignKey: 'usuario_id' });
models.HerramientaPrestamo.belongsTo(models.Usuario, { foreignKey: 'usuario_id' });

// --- Nómina ---
models.NominaSemana.hasMany(models.NominaDetalle, { foreignKey: 'nomina_id', onDelete: 'CASCADE' });
models.NominaDetalle.belongsTo(models.NominaSemana, { foreignKey: 'nomina_id' });
models.Usuario.hasMany(models.NominaDetalle, { foreignKey: 'trabajador_id' });
models.NominaDetalle.belongsTo(models.Usuario, { as: 'Trabajador', foreignKey: 'trabajador_id' });

// === AGREGA ESTO ===
models.NominaSemana.belongsTo(models.Usuario, { as: 'Creador', foreignKey: 'creado_por_id' });
models.NominaSemana.belongsTo(models.Usuario, { as: 'Aprobador', foreignKey: 'aprobado_por_id' });

models.Finca.hasMany(models.Lote, { foreignKey: 'finca_id', as: 'lotes' });
models.Lote.belongsTo(models.Finca, { foreignKey: 'finca_id', as: 'finca' });

// ✅ AGREGA ESTAS DOS LÍNEAS AQUÍ:
models.Finca.hasMany(models.Cosecha, { foreignKey: 'finca_id', as: 'cosechas' });
models.Cosecha.belongsTo(models.Finca, { foreignKey: 'finca_id' }); // Sin alias para que coincida con tu service
// ====================

// Helpers de DB
async function connect() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión DB establecida correctamente.');
  } catch (error) {
    console.error('❌ No se pudo conectar a la DB:', error);
  }
}

async function sync() {
  // ⚠️ ATENCIÓN: "alter: true" intentará adaptar las tablas existentes.
  // Dado que borramos tablas, Sequelize las eliminará si no están definidas.
  await sequelize.sync({ alter: true });
  console.log('✅ Modelos sincronizados con la DB.');
}

async function seed() {
  const runSeed = require('./seeders');
  await runSeed(models);
} 

module.exports = {
  sequelize,
  models,
  connect,
  sync,
  seed,
  ...models
};