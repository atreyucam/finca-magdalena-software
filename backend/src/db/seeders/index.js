// backend/src/db/seeds/index.js
/**
 * Seed maestro: crea roles, usuarios base, unidades, conversiones,
 * lotes, tipos de actividad, cosecha + periodos e items de inventario.
 * Es idempotente (usa findOrCreate / updates seguros).
 */
module.exports = async function runSeed(models) {
  const { Op, Sequelize } = models.Sequelize;

  // ===== Helpers =====
  async function ensureUnidad(codigo, nombre) {
    const [u] = await models.Unidad.findOrCreate({
      where: { codigo },
      defaults: { codigo, nombre },
    });
    return u;
  }
  async function ensureRole(nombre) {
    const [r] = await models.Role.findOrCreate({ where: { nombre }, defaults: { nombre } });
    return r;
  }
  async function ensureTipoActividad(codigo, nombre) {
    const [t] = await models.TipoActividad.findOrCreate({
      where: { codigo },
      defaults: { codigo, nombre },
    });
    return t;
  }
  async function ensureLote(nombre, defaults) {
    const [l] = await models.Lote.findOrCreate({ where: { nombre }, defaults: { nombre, ...defaults } });
    return l;
  }
  async function ensureCosecha(numero, anio_agricola, defaults) {
    const [c] = await models.Cosecha.findOrCreate({
      where: { numero, anio_agricola },
      defaults: { numero, anio_agricola, ...defaults },
    });
    return c;
  }
  async function ensurePeriodo(cosecha_id, nombre, semana_inicio, semana_fin) {
    const [p] = await models.PeriodoCosecha.findOrCreate({
      where: { cosecha_id, nombre },
      defaults: { cosecha_id, nombre, semana_inicio, semana_fin },
    });
    return p;
  }
  async function ensureItem(nombre, defaults) {
    const [i] = await models.InventarioItem.findOrCreate({
      where: { nombre },
      defaults: { nombre, ...defaults },
    });
    return i;
  }
  async function upsertConv(from, to, factor) {
    await models.ConversionUnidad.findOrCreate({
      where: { from_unidad_id: from.id, to_unidad_id: to.id, factor },
      defaults: { from_unidad_id: from.id, to_unidad_id: to.id, factor },
    });
  }

  // ===== Roles fijos =====
  await Promise.all([
    ensureRole('Propietario'),
    ensureRole('Tecnico'),
    ensureRole('Trabajador'),
  ]);

  // ===== Unidades =====
  const uUnidad = await ensureUnidad('unidad', 'Unidad');
  const uKg     = await ensureUnidad('kg', 'Kilogramo');
  const uG      = await ensureUnidad('g', 'Gramo');
  const uL      = await ensureUnidad('l', 'Litro');
  const uMl     = await ensureUnidad('ml', 'Mililitro');
  const uGal    = await ensureUnidad('gal', 'Galón');

  // ===== Conversiones básicas (para reportes/conversión) =====
  await upsertConv(uG,  uKg,  0.001);
  await upsertConv(uMl, uL,   0.001);
  await upsertConv(uGal,uL,   3.78541);

  // ===== Tipos de actividad =====
  const actividades = [
    ['poda',         'Poda'],
    ['maleza',       'Manejo de malezas'],
    ['nutricion',    'Nutrición'],
    ['fitosanitario','Protección fitosanitaria'],
    ['enfundado',    'Enfundado'],
    ['cosecha',      'Cosecha y postcosecha'],
  ];
  await Promise.all(actividades.map(([codigo, nombre]) => ensureTipoActividad(codigo, nombre)));

  // ===== Lotes demo =====
  await ensureLote('Lote A', { superficie_ha: 5.0, numero_plantas: 4000, estado: 'Activo' });
  await ensureLote('Lote B', { superficie_ha: 5.0, numero_plantas: 4000, estado: 'Activo' });

  // ===== Cosecha + Periodos =====
  const cosecha = await ensureCosecha(1, '2024-2025', {
    nombre: 'Cosecha 1',
    fecha_inicio: '2024-08-01',
    fecha_fin:    '2025-02-15',
    estado: 'Activa',
  });

  const periodos = [
    ['Reposo',              1,  2],
    ['Floración',           3,  4],
    ['Desarrollo',          5, 10],
    ['Cosecha/Postcosecha',11, 12],
  ];
  await Promise.all(periodos.map(([nombre, sIni, sFin]) => ensurePeriodo(cosecha.id, nombre, sIni, sFin)));

  // ===== Admin por defecto =====
  const { hashPassword } = require('../../utils/crypto');
  const propietario = await models.Role.findOne({ where: { nombre: 'Propietario' } });
  await models.Usuario.findOrCreate({
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
      estado: 'Activo',
    },
  });

  // ===== Inventario (ejemplos de Insumo/Herramienta/Equipo) =====
  const items = [
    // --- INSUMOS ---
    {
      nombre: 'Fertilizante NPK',
      categoria: 'Insumo',
      unidad_id: uKg.id,
      stock_actual: 100,
      stock_minimo: 10,
      meta: {
        tipo: 'Fertilizante agrícola',
        formulacion: 'Granulado',
        proveedor: 'AgroAndes',
        vencimiento: '2026-08',
      },
    },
    {
      nombre: 'SCORE',
      categoria: 'Insumo',
      unidad_id: uL.id,
      stock_actual: 5,
      stock_minimo: 1,
      meta: {
        tipo: 'Fungicida agrícola',
        formulacion: 'EC',
        proveedor: 'Syngenta - Ecuaquímica',
        vencimiento: '2026-07',
      },
    },
    {
      nombre: 'Cuprofix EQ',
      categoria: 'Insumo',
      unidad_id: uKg.id,
      stock_actual: 2,
      stock_minimo: 1,
      meta: {
        tipo: 'Fungicida agrícola',
        formulacion: 'WG',
        proveedor: 'UPL - Ecuaquímica',
        vencimiento: '2026-07',
      },
    },

    // --- HERRAMIENTAS ---
    {
      nombre: 'Machete',
      categoria: 'Herramienta',
      unidad_id: uUnidad.id,
      stock_actual: 10,
      stock_minimo: 2,
      meta: {},
    },
    {
      nombre: 'Tijeras de poda',
      categoria: 'Herramienta',
      unidad_id: uUnidad.id,
      stock_actual: 5,
      stock_minimo: 1,
      meta: {},
    },
    {
      nombre: 'Bomba de mochila',
      categoria: 'Herramienta',
      unidad_id: uUnidad.id,
      stock_actual: 3,
      stock_minimo: 1,
      meta: {},
    },

    // --- EQUIPO ---
    {
      nombre: 'Tractor John Deere',
      categoria: 'Equipo',
      unidad_id: uUnidad.id,
      stock_actual: 1,
      stock_minimo: 0,
      meta: {},
    },
    {
      nombre: 'Motoguadaña Stihl',
      categoria: 'Equipo',
      unidad_id: uUnidad.id,
      stock_actual: 2,
      stock_minimo: 0,
      meta: {},
    },
    {
      nombre: 'Generador Honda',
      categoria: 'Equipo',
      unidad_id: uUnidad.id,
      stock_actual: 1,
      stock_minimo: 0,
      meta: {},
    },
  ];
  for (const it of items) {
    await ensureItem(it.nombre, it);
  }

  // Corrección de integridad: Herramienta/Equipo deben quedar con unidad = 'unidad'
  await models.InventarioItem.update(
    { unidad_id: uUnidad.id },
    {
      where: {
        categoria: { [Op.in]: ['Herramienta', 'Equipo'] },
        unidad_id: { [Op.ne]: uUnidad.id },
      },
    }
  );

  console.log('✅ Seed maestro completado');
};
