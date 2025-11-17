const { Sequelize } = require('sequelize');
const { config } = require('../config/env');

// Models
const RoleModel                      = require('./models/role');
const UsuarioModel                   = require('./models/usuario');
const TipoActividadModel             = require('./models/tipoActividad');
const LoteModel                      = require('./models/lote');
const CosechaModel                   = require('./models/cosecha');
const PeriodoCosechaModel            = require('./models/periodoCosecha');

const UnidadModel                    = require('./models/unidad');
const ConversionUnidadModel          = require('./models/conversionUnidad');
const InventarioItemModel            = require('./models/inventarioItem');
const InventarioMovimientoModel      = require('./models/inventarioMovimiento');
const InventarioReservaModel         = require('./models/inventarioReserva');
const HerramientaPrestamoModel       = require('./models/herramientaPrestamo');

const TareaModel                     = require('./models/tarea');
const TareaAsignacionModel           = require('./models/tareaAsignacion');
const TareaEstadoModel               = require('./models/tareaEstado');
const NovedadModel                   = require('./models/novedad');
const TareaItemModel                 = require('./models/tareaItems');

const TareaPodaModel                 = require('./models/tareaPoda');
const TareaManejoMalezaModel         = require('./models/tareaManejoMaleza');
const TareaNutricionModel            = require('./models/tareaNutricion');
const TareaFitosanitariaModel        = require('./models/tareaFitosanitaria');
const TareaEnfundadoModel            = require('./models/tareaEnfundado');

const LoteCosechaModel               = require('./models/loteCosecha');
const LoteCosechaClasificacionModel  = require('./models/loteCosechaClasificacion');
const LoteCosechaRechazoModel        = require('./models/loteCosechaRechazo');

const NominaSemanaModel              = require('./models/nominaSemana');
const NominaDetalleModel             = require('./models/nominaDetalle');

// Sequelize
const sequelize = new Sequelize(
  config.db.name, 
  config.db.user, 
  config.db.pass,
  { 
    host: config.db.host, 
    port: config.db.port, 
    dialect: 'postgres', 
    logging: !!config.db.logging }
);

const models = {};

function initModels() {
  models.Sequelize = Sequelize;

  // Core
  models.Role                      = RoleModel(sequelize);
  models.Usuario                   = UsuarioModel(sequelize);
  models.TipoActividad             = TipoActividadModel(sequelize);
  models.Lote                      = LoteModel(sequelize);
  models.Cosecha                   = CosechaModel(sequelize);
  models.PeriodoCosecha            = PeriodoCosechaModel(sequelize);

  // Inventario
  models.Unidad                    = UnidadModel(sequelize);
  models.ConversionUnidad          = ConversionUnidadModel(sequelize);
  models.InventarioItem            = InventarioItemModel(sequelize);
  models.InventarioMovimiento      = InventarioMovimientoModel(sequelize);
  models.InventarioReserva         = InventarioReservaModel(sequelize);
  models.HerramientaPrestamo       = HerramientaPrestamoModel(sequelize);

  // Tareas
  models.Tarea                     = TareaModel(sequelize);
  models.TareaAsignacion           = TareaAsignacionModel(sequelize);
  models.TareaEstado               = TareaEstadoModel(sequelize);
  models.Novedad                   = NovedadModel(sequelize);
  models.TareaItem                 = TareaItemModel(sequelize);

  // Detalles de tareas (1:1)
  models.TareaPoda                 = TareaPodaModel(sequelize);
  models.TareaManejoMaleza         = TareaManejoMalezaModel(sequelize);
  models.TareaNutricion            = TareaNutricionModel(sequelize);
  models.TareaFitosanitaria        = TareaFitosanitariaModel(sequelize);
  models.TareaEnfundado            = TareaEnfundadoModel(sequelize);

  // Cosecha por lote
  models.LoteCosecha               = LoteCosechaModel(sequelize);
  models.LoteCosechaClasificacion  = LoteCosechaClasificacionModel(sequelize);
  models.LoteCosechaRechazo        = LoteCosechaRechazoModel(sequelize);

  // Nómina
  models.NominaSemana              = NominaSemanaModel(sequelize);
  models.NominaDetalle             = NominaDetalleModel(sequelize);

  // ===== Asociaciones =====

  // Roles / Usuarios
  models.Role.hasMany(models.Usuario, { foreignKey: 'role_id' });
  models.Usuario.belongsTo(models.Role, { foreignKey: 'role_id' });

  // Unidades / Inventario
  models.InventarioItem.belongsTo(models.Unidad, { foreignKey: 'unidad_id' });
  models.Unidad.hasMany(models.InventarioItem, { foreignKey: 'unidad_id' });

  models.InventarioMovimiento.belongsTo(models.InventarioItem, { foreignKey: 'item_id' });
  models.InventarioMovimiento.belongsTo(models.Unidad, { foreignKey: 'unidad_id' });
  models.InventarioItem.hasMany(models.InventarioMovimiento, { foreignKey: 'item_id' });

  models.InventarioReserva.belongsTo(models.Tarea, { foreignKey: 'tarea_id' });
  models.Tarea.hasMany(models.InventarioReserva, { foreignKey: 'tarea_id', onDelete: 'CASCADE' });
  models.InventarioReserva.belongsTo(models.InventarioItem, { foreignKey: 'item_id' });
  models.InventarioItem.hasMany(models.InventarioReserva, { foreignKey: 'item_id' });

  models.HerramientaPrestamo.belongsTo(models.InventarioItem, { foreignKey: 'item_id' });
  models.InventarioItem.hasMany(models.HerramientaPrestamo, { foreignKey: 'item_id' });
  models.HerramientaPrestamo.belongsTo(models.Usuario, { foreignKey: 'usuario_id' });
  models.Usuario.hasMany(models.HerramientaPrestamo, { foreignKey: 'usuario_id' });

  // Cosecha / Periodos / Tareas
  models.Cosecha.hasMany(models.PeriodoCosecha, { foreignKey: 'cosecha_id' });
  models.PeriodoCosecha.belongsTo(models.Cosecha, { foreignKey: 'cosecha_id' });

  models.Cosecha.hasMany(models.Tarea, { foreignKey: 'cosecha_id' });
  models.Tarea.belongsTo(models.Cosecha, { foreignKey: 'cosecha_id' });

  models.PeriodoCosecha.hasMany(models.Tarea, { foreignKey: 'periodo_id' });
  models.Tarea.belongsTo(models.PeriodoCosecha, { foreignKey: 'periodo_id' });

  models.Lote.hasMany(models.Tarea, { foreignKey: 'lote_id' });
  models.Tarea.belongsTo(models.Lote, { foreignKey: 'lote_id' });

  models.Tarea.belongsTo(models.TipoActividad, { foreignKey: 'tipo_id' });
  models.TipoActividad.hasMany(models.Tarea, { foreignKey: 'tipo_id' });

  models.Tarea.belongsTo(models.Usuario, { as: 'Creador', foreignKey: 'creador_id' });
  models.Usuario.hasMany(models.Tarea, { as: 'TareasCreadas', foreignKey: 'creador_id' });

  // Asignaciones / Estados / Novedades
  models.Tarea.hasMany(models.TareaAsignacion, { foreignKey: 'tarea_id', onDelete: 'CASCADE' });
  models.TareaAsignacion.belongsTo(models.Tarea, { foreignKey: 'tarea_id' });
  models.TareaAsignacion.belongsTo(models.Usuario, { foreignKey: 'usuario_id' });
  models.Usuario.hasMany(models.TareaAsignacion, { foreignKey: 'usuario_id' });

  models.Tarea.hasMany(models.TareaEstado, { foreignKey: 'tarea_id', onDelete: 'CASCADE' });
  models.TareaEstado.belongsTo(models.Tarea, { foreignKey: 'tarea_id' });
  models.TareaEstado.belongsTo(models.Usuario, { foreignKey: 'usuario_id' });

  models.Tarea.hasMany(models.Novedad, { foreignKey: 'tarea_id', onDelete: 'CASCADE' });
  models.Novedad.belongsTo(models.Tarea, { foreignKey: 'tarea_id' });
  models.Novedad.belongsTo(models.Usuario, { foreignKey: 'autor_id' });

  // TareaItems
  models.Tarea.hasMany(models.TareaItem, { foreignKey: 'tarea_id', onDelete: 'CASCADE' });
  models.TareaItem.belongsTo(models.Tarea, { foreignKey: 'tarea_id' });
  models.TareaItem.belongsTo(models.InventarioItem, { foreignKey: 'item_id' });
  models.InventarioItem.hasMany(models.TareaItem, { foreignKey: 'item_id' });
  models.TareaItem.belongsTo(models.Unidad, { foreignKey: 'unidad_id' });

  // Detalles 1:1
  models.Tarea.hasOne(models.TareaPoda, { foreignKey: 'tarea_id', onDelete: 'CASCADE' });
  models.TareaPoda.belongsTo(models.Tarea, { foreignKey: 'tarea_id' });

  models.Tarea.hasOne(models.TareaManejoMaleza, { foreignKey: 'tarea_id', onDelete: 'CASCADE' });
  models.TareaManejoMaleza.belongsTo(models.Tarea, { foreignKey: 'tarea_id' });

  models.Tarea.hasOne(models.TareaNutricion, { foreignKey: 'tarea_id', onDelete: 'CASCADE' });
  models.TareaNutricion.belongsTo(models.Tarea, { foreignKey: 'tarea_id' });

  models.Tarea.hasOne(models.TareaFitosanitaria, { foreignKey: 'tarea_id', onDelete: 'CASCADE' });
  models.TareaFitosanitaria.belongsTo(models.Tarea, { foreignKey: 'tarea_id' });

  models.Tarea.hasOne(models.TareaEnfundado, { foreignKey: 'tarea_id', onDelete: 'CASCADE' });
  models.TareaEnfundado.belongsTo(models.Tarea, { foreignKey: 'tarea_id' });

  // LoteCosecha y derivados
  models.LoteCosecha.belongsTo(models.Cosecha,        { foreignKey: 'cosecha_id' });
  models.LoteCosecha.belongsTo(models.Lote,           { foreignKey: 'lote_id' });
  models.LoteCosecha.belongsTo(models.PeriodoCosecha, { foreignKey: 'periodo_id' });
  models.LoteCosecha.belongsTo(models.Tarea,          { foreignKey: 'tarea_id' });

  models.LoteCosecha.hasMany(models.LoteCosechaClasificacion, { foreignKey: 'lote_cosecha_id', onDelete: 'CASCADE' });
  models.LoteCosechaClasificacion.belongsTo(models.LoteCosecha, { foreignKey: 'lote_cosecha_id' });

  models.LoteCosecha.hasMany(models.LoteCosechaRechazo, { foreignKey: 'lote_cosecha_id', onDelete: 'CASCADE' });
  models.LoteCosechaRechazo.belongsTo(models.LoteCosecha, { foreignKey: 'lote_cosecha_id' });

  // Nómina
  models.NominaSemana.hasMany(models.NominaDetalle, { foreignKey: 'nomina_id', onDelete: 'CASCADE' });
  models.NominaDetalle.belongsTo(models.NominaSemana, { foreignKey: 'nomina_id' });
  models.NominaDetalle.belongsTo(models.Usuario, { as: 'Trabajador', foreignKey: 'trabajador_id' });
  models.Usuario.hasMany(models.NominaDetalle, { foreignKey: 'trabajador_id' });
}

// 🔹 IMPORTANTE: inicializar modelos al cargar el módulo
initModels();

async function connect() {
  initModels();
  await sequelize.authenticate();
  console.log('DB conectado');
}

async function sync() {
  await sequelize.sync({ alter: true }); // solo DEV
  console.log('Modelos sincronizados');
}

async function seed() {
  const runSeed = require('./seeders');
  await runSeed(models);
}
// Exportamos sequelize, el mapa de modelos y, además, los modelos "planos".
module.exports = {
  sequelize,
  models,
  connect,
  sync,
  seed,
  ...models,   // <- esto hace que db.Role, db.Usuario, db.Lote, etc. existan
};