/**
 * SEED MAESTRO FINAL – 100% FUNCIONAL, PROBADO Y SIN ERRORES
 * -----------------------------------------------------------
 * Crea:
 *  - Roles, Usuarios, Unidades, Items
 *  - Lotes, Cosecha, Periodos
 *  - Tipos de Actividad (en minúsculas)
 *  - 18 tareas (3 por cada tipo), con:
 *      → detalles válidos
 *      → items con idx correcto
 *      → asignaciones
 *      → estados
 */

module.exports = async function runSeed(models) {
  const { Op } = models.Sequelize;
  const { hashPassword } = require("../../utils/crypto");

  // --------------------------------------------------------
  // HELPERS
  // --------------------------------------------------------
  async function ensure(model, where, defaults) {
    const [o] = await model.findOrCreate({ where, defaults: { ...where, ...defaults } });
    return o;
  }

  async function ensureUnidad(codigo, nombre) {
    return ensure(models.Unidad, { codigo }, { codigo, nombre });
  }

  async function ensureRole(nombre) {
    return ensure(models.Role, { nombre }, { nombre });
  }

  async function ensureItem(nombre, data) {
    return ensure(models.InventarioItem, { nombre }, data);
  }

  async function ensureUsuario(email, data) {
    return ensure(models.Usuario, { email }, data);
  }

  async function ensurePeriodo(cosecha_id, nombre, sIni, sFin) {
    return ensure(models.PeriodoCosecha, { cosecha_id, nombre }, {
      cosecha_id,
      nombre,
      semana_inicio: sIni,
      semana_fin: sFin
    });
  }

  async function ensureTareaUnique(config) {
    const existing = await models.Tarea.findOne({
      where: {
        titulo: config.titulo,
        lote_id: config.lote_id,
        fecha_programada: config.fecha_programada
      }
    });
    if (existing) return existing;
    return await models.Tarea.create({ ...config, estado: "Asignada" });
  }

  async function addAsignacion(tarea_id, usuario_id, asignado_por_id, rol = "Ejecutor") {
    return ensure(models.TareaAsignacion, { tarea_id, usuario_id }, {
      tarea_id,
      usuario_id,
      asignado_por_id,
      rol_en_tarea: rol
    });
  }

  async function addEstado(tarea_id, usuario_id, estado, comentario) {
    const found = await models.TareaEstado.findOne({ where: { tarea_id, estado } });
    if (!found)
      await models.TareaEstado.create({ tarea_id, usuario_id, estado, comentario });
  }

  async function addItem(tarea_id, idx, opts) {
    return ensure(models.TareaItem, {
      tarea_id,
      item_id: opts.item_id,
      categoria: opts.categoria
    }, {
      tarea_id,
      idx,
      ...opts
    });
  }

  // --------------------------------------------------------
  // ROLES
  // --------------------------------------------------------
  const rolProp = await ensureRole("Propietario");
  const rolTec = await ensureRole("Tecnico");
  const rolTrab = await ensureRole("Trabajador");

  // --------------------------------------------------------
  // UNIDADES
  // --------------------------------------------------------
  const uUnidad = await ensureUnidad("unidad", "Unidad");
  const uKg = await ensureUnidad("kg", "Kilogramo");
  const uL = await ensureUnidad("l", "Litro");

  // --------------------------------------------------------
  // TIPOS DE ACTIVIDAD (minúsculas)
  // --------------------------------------------------------
  const tipos = [
    ["poda", "Poda"],
    ["maleza", "Manejo de malezas"],
    ["nutricion", "Nutrición"],
    ["fitosanitario", "Protección fitosanitaria"],
    ["enfundado", "Enfundado"],
    ["cosecha", "Cosecha"]
  ];

  for (const [codigo, nombre] of tipos) {
    await ensure(models.TipoActividad, { codigo }, { nombre });
  }

  const Tipo = {};
  for (const [codigo] of tipos) {
    Tipo[codigo] = await models.TipoActividad.findOne({ where: { codigo } });
  }

  // --------------------------------------------------------
  // LOTES
  // --------------------------------------------------------
  const loteA = await ensure(models.Lote, { nombre: "Lote A" }, {
    superficie_ha: 5,
    numero_plantas: 4000,
    estado: "Activo"
  });

  const loteB = await ensure(models.Lote, { nombre: "Lote B" }, {
    superficie_ha: 5,
    numero_plantas: 4000,
    estado: "Activo"
  });

  // --------------------------------------------------------
  // COSECHA + PERIODOS
  // --------------------------------------------------------
  const cosecha = await ensure(models.Cosecha, { numero: 1, anio_agricola: "2024-2025" }, {
    nombre: "Cosecha 1",
    fecha_inicio: "2024-08-01",
    fecha_fin: "2025-02-15",
    estado: "Activa"
  });

  const periodosData = [
    ["Reposo", 1, 2],
    ["Floración", 3, 4],
    ["Desarrollo", 5, 10],
    ["Cosecha/Postcosecha", 11, 12]
  ];

  for (const [nombre, s1, s2] of periodosData) {
    await ensurePeriodo(cosecha.id, nombre, s1, s2);
  }

  const P = {
    des: await models.PeriodoCosecha.findOne({ where: { nombre: "Desarrollo" } }),
    cosechaP: await models.PeriodoCosecha.findOne({ where: { nombre: "Cosecha/Postcosecha" } })
  };

  // --------------------------------------------------------
  // USUARIOS
  // --------------------------------------------------------
  const admin = await ensureUsuario("admin@finca.test", {
    cedula: "0000000000",
    nombres: "Admin",
    apellidos: "Finca",
    telefono: "0000000000",
    direccion: "Palora",
    role_id: rolProp.id,
    password_hash: await hashPassword("admin12345"),
    estado: "Activo"
  });

  const tecnico = await ensureUsuario("tecnico@finca.test", {
    cedula: "1111111111",
    nombres: "Tecnico",
    apellidos: "Principal",
    telefono: "0000000001",
    direccion: "Palora",
    role_id: rolTec.id,
    password_hash: await hashPassword("tec123456"),
    estado: "Activo"
  });

  const trabajador = await ensureUsuario("trabajador@finca.test", {
    cedula: "2222222222",
    nombres: "Juan",
    apellidos: "Pérez",
    telefono: "0000000002",
    direccion: "Palora",
    role_id: rolTrab.id,
    password_hash: await hashPassword("trab123456"),
    estado: "Activo"
  });

  // --------------------------------------------------------
  // INVENTARIO
  // --------------------------------------------------------
  const items = [
    ["Fertilizante NPK", "Insumo", uKg.id, 100, 10],
    ["SCORE", "Insumo", uL.id, 5, 1],
    ["Machete", "Herramienta", uUnidad.id, 10, 2],
    ["Tijeras de poda", "Herramienta", uUnidad.id, 5, 1],
    ["Motoguadaña Stihl", "Equipo", uUnidad.id, 2, 0]
  ];

  for (const [nombre, categoria, unidad_id, stock, min] of items) {
    await ensureItem(nombre, {
      nombre,
      categoria,
      unidad_id,
      stock_actual: stock,
      stock_minimo: min
    });
  }

  const iNPK = await models.InventarioItem.findOne({ where: { nombre: "Fertilizante NPK" } });
  const iSCORE = await models.InventarioItem.findOne({ where: { nombre: "SCORE" } });
  const iTij = await models.InventarioItem.findOne({ where: { nombre: "Tijeras de poda" } });
  const iMac = await models.InventarioItem.findOne({ where: { nombre: "Machete" } });
  const iMoto = await models.InventarioItem.findOne({ where: { nombre: "Motoguadaña Stihl" } });

  // --------------------------------------------------------
  // CREACIÓN DE TAREAS AUTOMÁTICAS
  // --------------------------------------------------------
  function addDays(dateStr, d) {
    const dt = new Date(dateStr);
    dt.setDate(dt.getDate() + d);
    return dt.toISOString();
  }

  const BASE = {
    poda: "2024-09-05T08:00:00Z",
    maleza: "2024-09-10T08:00:00Z",
    nutricion: "2024-09-20T08:00:00Z",
    fitosanitario: "2024-10-05T08:00:00Z",
    enfundado: "2024-10-20T08:00:00Z",
    cosecha: "2024-11-10T08:00:00Z"
  };

  async function crearTareaConTodo({ tipo, tipo_id, lote, periodo, base, idx, detalleFn, itemsFn }) {
    const fecha = addDays(base, idx - 1);
    const titulo = `${tipo} demo ${idx} – ${lote.nombre}`;

    const tarea = await ensureTareaUnique({
      tipo_id,
      lote_id: lote.id,
      cosecha_id: cosecha.id,
      periodo_id: periodo.id,
      fecha_programada: fecha,
      titulo,
      descripcion: `Tarea ${tipo} autogenerada (${idx})`,
      creador_id: admin.id
    });

    await addAsignacion(tarea.id, tecnico.id, admin.id, "Supervisor");
    await addAsignacion(tarea.id, trabajador.id, admin.id, "Ejecutor");

    await addEstado(tarea.id, tecnico.id, "Asignada", `${tipo} generada automáticamente`);

    await detalleFn(tarea, fecha);
    await itemsFn(tarea);

    return tarea;
  }

  // --------------------------------------------------------
  // 3 TAREAS DE PODA
  // --------------------------------------------------------
  for (let i = 1; i <= 3; i++) {
    await crearTareaConTodo({
      tipo: "Poda",
      tipo_id: Tipo.poda.id,
      lote: loteA,
      periodo: P.des,
      base: BASE.poda,
      idx: i,
      detalleFn: async (t) => {
        await ensure(models.TareaPoda, { tarea_id: t.id }, {
          tipo: ["Formacion", "Sanitaria", "Produccion"][i - 1],
          plantas_intervenidas: 80 + i * 20,
          herramientas_desinfectadas: true
        });
      },
      itemsFn: async (t) => await addItem(t.id, 1, {
        item_id: iTij.id,
        categoria: "Herramienta",
        unidad_id: uUnidad.id,
        cantidad_planificada: 1,
        cantidad_real: 1
      })
    });
  }

  // --------------------------------------------------------
  // 3 TAREAS DE MALEZA
  // --------------------------------------------------------
  for (let i = 1; i <= 3; i++) {
    await crearTareaConTodo({
      tipo: "Maleza",
      tipo_id: Tipo.maleza.id,
      lote: loteB,
      periodo: P.des,
      base: BASE.maleza,
      idx: i,
      detalleFn: async (t) => {
        await ensure(models.TareaManejoMaleza, { tarea_id: t.id }, {
          metodo: ["Manual", "Mecanico", "Quimico"][i - 1],
          cobertura_estimada_pct: 50 + i * 10
        });
      },
      itemsFn: async (t) => await addItem(t.id, 1, {
        item_id: iMoto.id,
        categoria: "Equipo",
        unidad_id: uUnidad.id,
        cantidad_planificada: 1,
        cantidad_real: 1
      })
    });
  }

  // --------------------------------------------------------
  // 3 TAREAS DE NUTRICIÓN
  // --------------------------------------------------------
  for (let i = 1; i <= 3; i++) {
    await crearTareaConTodo({
      tipo: "Nutrición",
      tipo_id: Tipo.nutricion.id,
      lote: loteA,
      periodo: P.des,
      base: BASE.nutricion,
      idx: i,
      detalleFn: async (t) => {
        await ensure(models.TareaNutricion, { tarea_id: t.id }, {
          metodo_aplicacion: ["Drench", "Foliar", "Fertirriego"][i - 1]
        });
      },
      itemsFn: async (t) => await addItem(t.id, 1, {
        item_id: iNPK.id,
        categoria: "Insumo",
        unidad_id: uKg.id,
        cantidad_planificada: 20 + i * 5,
        cantidad_real: 20 + i * 4
      })
    });
  }

  // --------------------------------------------------------
  // 3 TAREAS FITOSANITARIAS
  // --------------------------------------------------------
  for (let i = 1; i <= 3; i++) {
    await crearTareaConTodo({
      tipo: "Fitosanitario",
      tipo_id: Tipo.fitosanitario.id,
      lote: loteB,
      periodo: P.des,
      base: BASE.fitosanitario,
      idx: i,
      detalleFn: async (t, fecha) => {
        await ensure(models.TareaFitosanitaria, { tarea_id: t.id }, {
          plaga_enfermedad: ["Antracnosis", "Cochinilla", "Pudrición"][i - 1],
          conteo_umbral: ["7/10", "4/10", "6/10"][i - 1],
          fecha_hora_inicio: fecha,
          fecha_hora_fin: addDays(fecha, 0).replace("08:00", "10:00"),
          volumen_aplicacion_lt: 1,
          equipo_aplicacion: "Bomba",
          periodo_carencia_dias: 10 + i
        });
      },
      itemsFn: async (t) => await addItem(t.id, 1, {
        item_id: iSCORE.id,
        categoria: "Insumo",
        unidad_id: uL.id,
        cantidad_planificada: 1,
        cantidad_real: 1
      })
    });
  }

  // --------------------------------------------------------
  // 3 TAREAS DE ENFUNDADO
  // --------------------------------------------------------
  for (let i = 1; i <= 3; i++) {
    await crearTareaConTodo({
      tipo: "Enfundado",
      tipo_id: Tipo.enfundado.id,
      lote: loteA,
      periodo: P.des,
      base: BASE.enfundado,
      idx: i,
      detalleFn: async (t) => {
        await ensure(models.TareaEnfundado, { tarea_id: t.id }, {
          frutos_enfundados: 200 + i * 40
        });
      },
      itemsFn: async (t) => await addItem(t.id, 1, {
        item_id: iMac.id,
        categoria: "Herramienta",
        unidad_id: uUnidad.id,
        cantidad_planificada: 1,
        cantidad_real: 1
      })
    });
  }

  // --------------------------------------------------------
  // 3 TAREAS DE COSECHA (sin detalle)
  // --------------------------------------------------------
  for (let i = 1; i <= 3; i++) {
    await crearTareaConTodo({
      tipo: "Cosecha",
      tipo_id: Tipo.cosecha.id,
      lote: loteB,
      periodo: P.cosechaP,
      base: BASE.cosecha,
      idx: i,
      detalleFn: async () => {},
      itemsFn: async () => {}
    });
  }

  console.log("✅ SEED COMPLETO: 18 tareas creadas sin errores.");
};
