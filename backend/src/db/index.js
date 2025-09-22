const { Sequelize } = require('sequelize');
const { config } = require('../config/env');

const RoleModel = require('./models/role');
const UsuarioModel = require('./models/usuario');
const LoteModel = require('./models/lote');
const UnidadModel = require('./models/unidad');
const TipoActividadModel = require('./models/tipoActividad');
const ConversionUnidadModel = require('./models/conversionUnidad');
const TareaModel = require('./models/tarea');
const TareaAsignacionModel = require('./models/tareaAsignacion');
const TareaEstadoModel = require('./models/tareaEstado');
const NovedadModel = require('./models/novedad')
const InventarioItemModel = require('./models/inventarioItem');
const InventarioMovimientoModel = require('./models/inventarioMovimiento');
const TareaInsumoModel = require('./models/tareaInsumo');
const HerramientaPrestamoModel = require('./models/herramientaPrestamo');
const NominaSemanaModel = require('./models/nominaSemana');
const NominaDetalleModel = require('./models/nominaDetalle');
const NotificacionModel = require('./models/notificacion');
const cosechaModel = require('./models/cosecha');
const periodocosechaModel = require('./models/periodoCosecha');

const sequelize = new Sequelize(config.db.name, config.db.user, config.db.pass, {
  host: config.db.host,
  port: config.db.port,
  dialect: 'postgres',
  logging: config.db.logging ? console.log : false,
});

const models = {};

function initModels() {
  models.Role = RoleModel(sequelize);
  models.Usuario = UsuarioModel(sequelize);
  models.Lote = LoteModel(sequelize);
  models.Unidad = UnidadModel(sequelize);
  models.TipoActividad = TipoActividadModel(sequelize);
  models.ConversionUnidad = ConversionUnidadModel(sequelize);
  models.Tarea = TareaModel(sequelize);
  models.TareaAsignacion = TareaAsignacionModel(sequelize);
  models.TareaEstado = TareaEstadoModel(sequelize);
  models.Novedad = NovedadModel(sequelize);
  models.InventarioItem = InventarioItemModel(sequelize);
models.InventarioMovimiento = InventarioMovimientoModel(sequelize);
models.TareaInsumo = TareaInsumoModel(sequelize);
models.HerramientaPrestamo = HerramientaPrestamoModel(sequelize);
models.Cosecha = cosechaModel(sequelize);
models.PeriodoCosecha = periodocosechaModel(sequelize);

  // ===== Asociaciones mínimas Sprint 0 =====
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

  // relaciones unidades
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

models.NominaSemana = NominaSemanaModel(sequelize);
models.NominaDetalle = NominaDetalleModel(sequelize);


models.NominaSemana.hasMany(models.NominaDetalle, { foreignKey: 'nomina_id', onDelete: 'CASCADE' });
models.NominaDetalle.belongsTo(models.NominaSemana, { foreignKey: 'nomina_id' });
models.NominaDetalle.belongsTo(models.Usuario, { as: 'Trabajador', foreignKey: 'trabajador_id' });
models.Usuario.hasMany(models.NominaDetalle, { foreignKey: 'trabajador_id' });

models.Notificacion = NotificacionModel(sequelize);
models.Notificacion.belongsTo(models.Usuario, { foreignKey: 'usuario_id' });
models.Usuario.hasMany(models.Notificacion, { foreignKey: 'usuario_id' });

// Cosecha tiene muchos Periodos
models.Cosecha.hasMany(models.PeriodoCosecha, { foreignKey: "cosecha_id" });
models.PeriodoCosecha.belongsTo(models.Cosecha, { foreignKey: "cosecha_id" });

// Cosecha tiene muchas Tareas
models.Cosecha.hasMany(models.Tarea, { foreignKey: "cosecha_id" });
models.Tarea.belongsTo(models.Cosecha, { foreignKey: "cosecha_id" });

// PeriodoCosecha tiene muchas Tareas
models.PeriodoCosecha.hasMany(models.Tarea, { foreignKey: "periodo_id" });
models.Tarea.belongsTo(models.PeriodoCosecha, { foreignKey: "periodo_id" });

}

async function connect() {
  initModels();
  await sequelize.authenticate();
  console.log('DB conectado');
}

async function sync() {
  await sequelize.sync({ alter: true }); // Solo dev; en prod usaremos migraciones
  console.log('Modelos sincronizados');
}

async function seed() {
  const { Role, Unidad, TipoActividad, Usuario, Lote, ConversionUnidad } = models;

  // Roles fijos
  for (const nombre of ['Propietario', 'Tecnico', 'Trabajador']) {
    await Role.findOrCreate({ where: { nombre }, defaults: { nombre } });
  }

  // Cosecha demo
const cosecha1 = await models.Cosecha.findOrCreate({
  where: { numero: 1, anio_agricola: '2024-2025' },
  defaults: {
    nombre: 'Cosecha 1',
    numero: 1,
    anio_agricola: '2024-2025',
    fecha_inicio: '2024-08-01',
    fecha_fin: '2025-02-15',
    estado: 'Activa'
  }
});

// Periodos demo (reposo, floración, desarrollo, cosecha/postcosecha)
const [cosecha] = cosecha1;
const periodos = [
  { nombre: 'Reposo', semana_inicio: 1, semana_fin: 2 },
  { nombre: 'Floración', semana_inicio: 3, semana_fin: 4 },
  { nombre: 'Desarrollo', semana_inicio: 5, semana_fin: 10 },
  { nombre: 'Cosecha/Postcosecha', semana_inicio: 11, semana_fin: 12 }
];
for (const p of periodos) {
  await models.PeriodoCosecha.findOrCreate({ 
    where: { cosecha_id: cosecha.id, nombre: p.nombre },
    defaults: { ...p, cosecha_id: cosecha.id }
  });
}


  // Unidades
  const unidades = [
    { codigo: 'unidad', nombre: 'Unidad' },
    { codigo: 'kg', nombre: 'Kilogramo' },
    { codigo: 'g', nombre: 'Gramo' },
    { codigo: 'l', nombre: 'Litro' },
    { codigo: 'ml', nombre: 'Mililitro' },
    { codigo: 'gal', nombre: 'Galón' },
  ];
  for (const u of unidades) {
    await Unidad.findOrCreate({ where: { codigo: u.codigo }, defaults: u });
  }

  // Conversiones básicas (para UI/reportes)
  const [g, kg, ml, l, gal] = await Promise.all([
    Unidad.findOne({ where: { codigo: 'g' } }),
    Unidad.findOne({ where: { codigo: 'kg' } }),
    Unidad.findOne({ where: { codigo: 'ml' } }),
    Unidad.findOne({ where: { codigo: 'l' } }),
    Unidad.findOne({ where: { codigo: 'gal' } }),
  ]);
  const convs = [
    { from_unidad_id: g.id, to_unidad_id: kg.id, factor: 0.001 },
    { from_unidad_id: ml.id, to_unidad_id: l.id, factor: 0.001 },
    { from_unidad_id: gal.id, to_unidad_id: l.id, factor: 3.78541 },
  ];
  for (const c of convs) {
    await ConversionUnidad.findOrCreate({ where: c, defaults: c });
  }

  // Items demo
const uKg = await models.Unidad.findOne({ where: { codigo: 'kg' } });
const uL = await models.Unidad.findOne({ where: { codigo: 'l' } });
await models.InventarioItem.findOrCreate({ where: { nombre: 'Fertilizante NPK' }, defaults: { nombre: 'Fertilizante NPK', categoria: 'Insumo', unidad_id: uKg.id, stock_actual: 50, stock_minimo: 10 } });
await models.InventarioItem.findOrCreate({ where: { nombre: 'Fungicida Bio' }, defaults: { nombre: 'Fungicida Bio', categoria: 'Insumo', unidad_id: uL.id, stock_actual: 20, stock_minimo: 5 } });
await models.InventarioItem.findOrCreate({ where: { nombre: 'Machete' }, defaults: { nombre: 'Machete', categoria: 'Herramienta', unidad_id: uKg.id, stock_actual: 0, stock_minimo: 0 } });

  // Tipos de actividad
  const actividades = [
    { codigo: 'poda', nombre: 'Poda' },
    { codigo: 'maleza', nombre: 'Manejo de malezas' },
    { codigo: 'nutricion', nombre: 'Nutrición' },
    { codigo: 'fitosanitario', nombre: 'Protección fitosanitaria' },
    { codigo: 'enfundado', nombre: 'Enfundado' },
    { codigo: 'cosecha', nombre: 'Cosecha y postcosecha' },
  ];
  for (const a of actividades) {
    await TipoActividad.findOrCreate({ where: { codigo: a.codigo }, defaults: a });
  }

  // Lotes demo
  await Lote.findOrCreate({
    where: { nombre: 'Lote A' },
    defaults: { nombre: 'Lote A', superficie_ha: 5.0, numero_plantas: 4000, estado: 'Activo' },
  });
  await Lote.findOrCreate({
    where: { nombre: 'Lote B' },
    defaults: { nombre: 'Lote B', superficie_ha: 5.0, numero_plantas: 4000, estado: 'Activo' },
  });


  // Admin por defecto
  const { hashPassword } = require('../utils/crypto');
  const propietario = await Role.findOne({ where: { nombre: 'Propietario' } });
  await Usuario.findOrCreate({
    where: { email: 'admin@finca.test' },
    defaults: {
      cedula: '0000000000',
      nombres: 'Admin',
      apellidos: 'Finca',
      email: 'admin@finca.test',
      telefono: '0000000000',
      direccion: 'Palora',
      role_id: propietario.id,
      password_hash: await hashPassword('admin12345'),
    },
  });

  console.log('Seeds listos');
}

module.exports = { sequelize, models, connect, sync, seed };
