// src/db/index.js
const { Sequelize } = require('sequelize');
const { config } = require('../config/env');

// ===== Model loaders =====
const RoleModel                 = require('./models/role');
const UsuarioModel              = require('./models/usuario');
const LoteModel                 = require('./models/lote');
const UnidadModel               = require('./models/unidad');
const TipoActividadModel        = require('./models/tipoActividad');
const ConversionUnidadModel     = require('./models/conversionUnidad');
const TareaModel                = require('./models/tarea');
const TareaAsignacionModel      = require('./models/tareaAsignacion');
const TareaEstadoModel          = require('./models/tareaEstado');
const NovedadModel              = require('./models/novedad');
const InventarioItemModel       = require('./models/inventarioItem');
const InventarioMovimientoModel = require('./models/inventarioMovimiento');
const TareaInsumoModel          = require('./models/tareaInsumo');
const HerramientaPrestamoModel  = require('./models/herramientaPrestamo');
const NominaSemanaModel         = require('./models/nominaSemana');
const NominaDetalleModel        = require('./models/nominaDetalle');
const NotificacionModel         = require('./models/notificacion');
const CosechaModel              = require('./models/cosecha');
const PeriodoCosechaModel       = require('./models/periodoCosecha');
const InventarioReservaModel   = require('./models/inventarioReserva');
const TareaRequerimientoModel  = require('./models/tareaRequerimiento');
// requires (junto a los demás)
const LoteCosechaModel              = require('./models/loteCosecha');
const LoteCosechaClasificacionModel = require('./models/loteCosechaClasificacion');
const LoteCosechaRechazoModel       = require('./models/loteCosechaRechazo');
const LoteCosechaPoscosechaModel    = require('./models/loteCosechaPoscosecha');

// ===== DB init =====
const sequelize = new Sequelize(
  config.db.name, config.db.user, config.db.pass,
  { host: config.db.host, port: config.db.port, dialect: 'postgres', logging: config.db.logging ? console.log : false }
);

const models = {};

function initModels() {
  models.Sequelize = Sequelize;

  models.Role                 = RoleModel(sequelize);
  models.Usuario              = UsuarioModel(sequelize);
  models.Lote                 = LoteModel(sequelize);
  models.Unidad               = UnidadModel(sequelize);
  models.TipoActividad        = TipoActividadModel(sequelize);
  models.ConversionUnidad     = ConversionUnidadModel(sequelize);
  models.Tarea                = TareaModel(sequelize);
  models.TareaAsignacion      = TareaAsignacionModel(sequelize);
  models.TareaEstado          = TareaEstadoModel(sequelize);
  models.Novedad              = NovedadModel(sequelize);
  models.InventarioItem       = InventarioItemModel(sequelize);
  models.InventarioMovimiento = InventarioMovimientoModel(sequelize);
  models.TareaInsumo          = TareaInsumoModel(sequelize);
  models.HerramientaPrestamo  = HerramientaPrestamoModel(sequelize);
  models.NominaSemana         = NominaSemanaModel(sequelize);
  models.NominaDetalle        = NominaDetalleModel(sequelize);
  models.Notificacion         = NotificacionModel(sequelize);
  models.Cosecha              = CosechaModel(sequelize);
  models.PeriodoCosecha       = PeriodoCosechaModel(sequelize);
  models.InventarioReserva   = InventarioReservaModel(sequelize);
models.TareaRequerimiento  = TareaRequerimientoModel(sequelize);
models.LoteCosecha              = LoteCosechaModel(sequelize);
models.LoteCosechaClasificacion = LoteCosechaClasificacionModel(sequelize);
models.LoteCosechaRechazo       = LoteCosechaRechazoModel(sequelize);
models.LoteCosechaPoscosecha    = LoteCosechaPoscosechaModel(sequelize);

  // ===== Asociaciones =====
  // Role 1:N Usuario
  models.Role.hasMany(models.Usuario, { foreignKey: 'role_id' });
  models.Usuario.belongsTo(models.Role, { foreignKey: 'role_id' });

  // Tarea relaciones
  models.Tarea.belongsTo(models.TipoActividad, { foreignKey: 'tipo_id' });
  models.TipoActividad.hasMany(models.Tarea, { foreignKey: 'tipo_id' });
  models.Tarea.belongsTo(models.Lote, { foreignKey: 'lote_id' });
  models.Lote.hasMany(models.Tarea, { foreignKey: 'lote_id' });
  models.Tarea.belongsTo(models.Usuario, { as: 'Creador', foreignKey: 'creador_id' });
  models.Usuario.hasMany(models.Tarea, { as: 'TareasCreadas', foreignKey: 'creador_id' });

  // Asignaciones
  models.Tarea.hasMany(models.TareaAsignacion, { foreignKey: 'tarea_id', onDelete: 'CASCADE' });
  models.TareaAsignacion.belongsTo(models.Tarea, { foreignKey: 'tarea_id' });
  models.TareaAsignacion.belongsTo(models.Usuario, { foreignKey: 'usuario_id' });
  models.Usuario.hasMany(models.TareaAsignacion, { foreignKey: 'usuario_id' });

  // Estados
  models.Tarea.hasMany(models.TareaEstado, { foreignKey: 'tarea_id', onDelete: 'CASCADE' });
  models.TareaEstado.belongsTo(models.Tarea, { foreignKey: 'tarea_id' });
  models.TareaEstado.belongsTo(models.Usuario, { foreignKey: 'usuario_id' });

  // Novedades
  models.Tarea.hasMany(models.Novedad, { foreignKey: 'tarea_id', onDelete: 'CASCADE' });
  models.Novedad.belongsTo(models.Tarea, { foreignKey: 'tarea_id' });
  models.Novedad.belongsTo(models.Usuario, { foreignKey: 'autor_id' });

  // Inventario / Unidades
  models.InventarioItem.belongsTo(models.Unidad, { foreignKey: 'unidad_id' });
  models.Unidad.hasMany(models.InventarioItem, { foreignKey: 'unidad_id' });

  models.InventarioMovimiento.belongsTo(models.InventarioItem, { foreignKey: 'item_id' });
  models.InventarioMovimiento.belongsTo(models.Unidad, { foreignKey: 'unidad_id' });
  models.InventarioItem.hasMany(models.InventarioMovimiento, { foreignKey: 'item_id' });

  // TareaInsumo
  models.TareaInsumo.belongsTo(models.Tarea, { foreignKey: 'tarea_id' });
  models.Tarea.hasMany(models.TareaInsumo, { foreignKey: 'tarea_id', onDelete: 'CASCADE' });
  models.TareaInsumo.belongsTo(models.InventarioItem, { foreignKey: 'item_id' });
  models.InventarioItem.hasMany(models.TareaInsumo, { foreignKey: 'item_id' });
  models.TareaInsumo.belongsTo(models.Unidad, { foreignKey: 'unidad_id' });

  // HerramientaPrestamo
  models.HerramientaPrestamo.belongsTo(models.InventarioItem, { foreignKey: 'item_id' });
  models.InventarioItem.hasMany(models.HerramientaPrestamo, { foreignKey: 'item_id' });
  models.HerramientaPrestamo.belongsTo(models.Usuario, { foreignKey: 'usuario_id' });
  models.Usuario.hasMany(models.HerramientaPrestamo, { foreignKey: 'usuario_id' });

  // Nómina
  models.NominaSemana.hasMany(models.NominaDetalle, { foreignKey: 'nomina_id', onDelete: 'CASCADE' });
  models.NominaDetalle.belongsTo(models.NominaSemana, { foreignKey: 'nomina_id' });
  models.NominaDetalle.belongsTo(models.Usuario, { as: 'Trabajador', foreignKey: 'trabajador_id' });
  models.Usuario.hasMany(models.NominaDetalle, { foreignKey: 'trabajador_id' });

  // Notificaciones
  models.Notificacion.belongsTo(models.Usuario, { foreignKey: 'usuario_id' });
  models.Usuario.hasMany(models.Notificacion, { foreignKey: 'usuario_id' });

  // Cosecha / Periodos / Tareas
  models.Cosecha.hasMany(models.PeriodoCosecha, { foreignKey: 'cosecha_id' });
  models.PeriodoCosecha.belongsTo(models.Cosecha, { foreignKey: 'cosecha_id' });
  models.Cosecha.hasMany(models.Tarea, { foreignKey: 'cosecha_id' });
  models.Tarea.belongsTo(models.Cosecha, { foreignKey: 'cosecha_id' });
  models.PeriodoCosecha.hasMany(models.Tarea, { foreignKey: 'periodo_id' });
  models.Tarea.belongsTo(models.PeriodoCosecha, { foreignKey: 'periodo_id' });


  // Asociaciones
models.InventarioReserva.belongsTo(models.Tarea, { foreignKey: 'tarea_id' });
models.Tarea.hasMany(models.InventarioReserva, { foreignKey: 'tarea_id', onDelete: 'CASCADE' });
models.InventarioReserva.belongsTo(models.InventarioItem, { foreignKey: 'item_id' });
models.InventarioItem.hasMany(models.InventarioReserva, { foreignKey: 'item_id' });

models.TareaRequerimiento.belongsTo(models.Tarea, { foreignKey: 'tarea_id' });
models.Tarea.hasMany(models.TareaRequerimiento, { foreignKey: 'tarea_id', onDelete: 'CASCADE' });
models.TareaRequerimiento.belongsTo(models.InventarioItem, { foreignKey: 'item_id' });
models.InventarioItem.hasMany(models.TareaRequerimiento, { foreignKey: 'item_id' });
models.TareaRequerimiento.belongsTo(models.Unidad, { foreignKey: 'unidad_id' });


// asociaciones (después de las existentes)
models.LoteCosecha.belongsTo(models.Cosecha,        { foreignKey: 'cosecha_id' });
models.LoteCosecha.belongsTo(models.Lote,           { foreignKey: 'lote_id' });
models.LoteCosecha.belongsTo(models.PeriodoCosecha, { foreignKey: 'periodo_id' });
models.LoteCosecha.belongsTo(models.Tarea,          { foreignKey: 'tarea_id' });

models.LoteCosecha.hasMany(models.LoteCosechaClasificacion, { foreignKey: 'lote_cosecha_id', onDelete: 'CASCADE' });
models.LoteCosecha.hasMany(models.LoteCosechaRechazo,       { foreignKey: 'lote_cosecha_id', onDelete: 'CASCADE' });
models.LoteCosecha.hasOne(models.LoteCosechaPoscosecha,     { foreignKey: 'lote_cosecha_id', onDelete: 'CASCADE' });
}

async function connect() {
  initModels();
  await sequelize.authenticate();
  console.log('DB conectado');
}

async function sync() {
  await sequelize.sync({ alter: true }); // dev only
  console.log('Modelos sincronizados');
}

async function seed() {
  const runSeed = require('./seeders'); // <-- seed maestro
  await runSeed(models);
}

module.exports = { sequelize, models, connect, sync, seed };
