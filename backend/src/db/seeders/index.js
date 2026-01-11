/**
 * SEED MAESTRO - SISTEMA DE GESTIÓN AGRONÓMICA (CATÁLOGOS + 30 USUARIOS)
 * ----------------------------------------------------------------------
 * - Unidades: { id autoincrement, codigo=KG, nombre=Kilogramo }
 * - Usuarios: 30 en total (4 Propietarios, 4 Técnicos, 22 Trabajadores)
 * - Inventario: 150 ítems (50 Insumos, 50 Herramientas, 50 Equipos)
 * - ✅ EXTRA: Datos de prueba para Reportes (FEFO + Préstamos)
 */

module.exports = async function runSeed(models) {
  const { hashPassword } = require("../../utils/crypto");
  const { Op } = require("sequelize");

  // Configuración
  const RESET = true;
  if (process.env.NODE_ENV === "production") throw new Error("❌ NO EJECUTAR EN PROD");

  console.log("🌱 Seed Maestro: Iniciando...");

  // Helpers
  const zpad = (n, len = 2) => String(n).padStart(len, "0");
  const makeCedula = (i) => String(1000000000 + i).slice(0, 10); // 10 dígitos únicos (dummy)
  const makeEmail = (roleSlug, i) => `${roleSlug}${zpad(i, 2)}@finca.test`;

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const addDays = (date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  const ymd = (d) => d.toISOString().slice(0, 10); // DATEONLY

  // 1) LIMPIEZA
  if (RESET) {
    console.log("🧹 Limpiando base de datos...");

    // Ajusta el orden si tu DB tiene FKs adicionales
    const tables = [
      models.NominaDetalle,
      models.NominaSemana,
      models.InventarioMovimiento,
      models.HerramientaPrestamo,
      models.InventarioLote,
      models.TareaAsignacion,
      models.TareaItem,
      models.Novedad,
      models.Tarea,
      models.InventarioItem,
      models.PeriodoCosecha,
      models.Cosecha,
      models.Lote,
      models.Finca,
      models.Usuario,
      models.TipoActividad,
      models.Unidad,
      models.Role,
    ];

    for (const m of tables) {
      if (m) {
        await m.destroy({ where: {}, truncate: true, cascade: true, restartIdentity: true });
      }
    }
  }

  // 2) CATÁLOGOS BASE
  console.log("🏗️ Creando catálogos...");

  // Roles
  const roles = {};
  for (const r of ["Propietario", "Tecnico", "Trabajador"]) {
    roles[r] = await models.Role.create({ nombre: r });
  }

  // Unidades (id auto). Formato deseado: "1; KG; Kilogramo"
  // => en DB queda: { id: 1, codigo: "KG", nombre: "Kilogramo" }
  const unidadesBase = [
    { codigo: "KG", nombre: "Kilogramo" },
    { codigo: "G", nombre: "Gramo" },
    { codigo: "L", nombre: "Litro" },
    { codigo: "ML", nombre: "Mililitro" },
    { codigo: "GAL", nombre: "Galón" },
    { codigo: "UND", nombre: "Unidad" },
    { codigo: "HA", nombre: "Hectárea" },
    { codigo: "M", nombre: "Metro" },
    { codigo: "CM", nombre: "Centímetro" },
  ];

  const u = {};
  for (const it of unidadesBase) {
    const row = await models.Unidad.create({
      codigo: it.codigo,
      nombre: it.nombre,
    });
    u[it.codigo] = row;
  }

  // Tipos de actividad
  const tipos = {};
  const listaTipos = [
    ["poda", "Poda"],
    ["maleza", "Manejo de malezas"],
    ["nutricion", "Nutrición"],
    ["fitosanitario", "Protección Fitosanitaria"],
    ["enfundado", "Enfundado"],
    ["cosecha", "Cosecha"],
  ];

  for (const [codigo, nombre] of listaTipos) {
    tipos[codigo] = await models.TipoActividad.create({ codigo, nombre });
  }

  // 3) USUARIOS (30 TOTAL)
  console.log("👥 Creando usuarios (30)...");

  const pass = await hashPassword("123456");

  // Crea 4 propietarios, 4 técnicos, 22 trabajadores
  const usuarios = [];

  // Propietarios (4)
  for (let i = 1; i <= 4; i++) {
    usuarios.push({
      cedula: makeCedula(i),
      nombres: `Propietario${zpad(i)}`,
      apellidos: "Finca",
      email: makeEmail("prop", i),
      role_id: roles.Propietario.id,
      password_hash: pass,
      estado: "Activo",
      tipo: "Fijo",
    });
  }

  // Técnicos (4)
  for (let i = 1; i <= 4; i++) {
    const idx = 100 + i;
    usuarios.push({
      cedula: makeCedula(idx),
      nombres: `Tecnico${zpad(i)}`,
      apellidos: "Campo",
      email: makeEmail("tec", i),
      role_id: roles.Tecnico.id,
      password_hash: pass,
      estado: "Activo",
      tipo: "Fijo",
    });
  }

  // Trabajadores (22)
  for (let i = 1; i <= 22; i++) {
    const idx = 200 + i;
    usuarios.push({
      cedula: makeCedula(idx),
      nombres: `Trabajador${zpad(i)}`,
      apellidos: "Operativo",
      email: makeEmail("tra", i),
      role_id: roles.Trabajador.id,
      password_hash: pass,
      estado: "Activo",
      tipo: "Fijo",
    });
  }

  // Inserta en DB
  const usuariosCreados = [];
  for (const data of usuarios) {
    usuariosCreados.push(await models.Usuario.create(data));
  }

  // Referencias útiles (por si luego quieres enganchar fincas/tareas)
  const propietarios = usuariosCreados.filter((x) => x.role_id === roles.Propietario.id);
  const tecnicos = usuariosCreados.filter((x) => x.role_id === roles.Tecnico.id);
  const trabajadores = usuariosCreados.filter((x) => x.role_id === roles.Trabajador.id);

  // 4) INVENTARIO BASE (150 ítems: 50 Insumos + 50 Herramientas + 50 Equipos)
  console.log("📦 Creando inventario base (150 ítems)...");

  // Unidades recomendadas por categoría
  const unidadesInsumos = [u.KG?.id, u.G?.id, u.L?.id, u.ML?.id, u.GAL?.id].filter(Boolean);
  const unidadHerramienta = u.UND?.id || u.KG?.id; // fallback
  const unidadEquipo = u.UND?.id || u.KG?.id;

  // Defaults mínimos por categoría
  const MIN = {
    Insumo: 50,
    Herramienta: 15,
    Equipo: 10,
  };

  // Stock inicial
  const stockInicialPorCategoria = (categoria) => {
    if (categoria === "Insumo") return (MIN.Insumo + 20).toFixed(3); // 70.000
    if (categoria === "Herramienta") return (MIN.Herramienta + 5).toFixed(3); // 20.000
    return (MIN.Equipo + 2).toFixed(3); // 12.000
  };

  // Generador de nombres únicos
  const makeNombre = (categoria, i) => `${categoria} ${String(i).padStart(3, "0")}`;

  const itemsCreados = [];

  const crearItemConLoteYMovimiento = async ({ categoria, idx }) => {
    const nombre = makeNombre(categoria, idx);

    // unidad por categoría
    const unidad_id =
      categoria === "Insumo"
        ? pick(unidadesInsumos)
        : categoria === "Herramienta"
          ? unidadHerramienta
          : unidadEquipo;

    const stock_minimo = MIN[categoria];
    const stock_inicial = stockInicialPorCategoria(categoria);

    // 1) Crear maestro
    const item = await models.InventarioItem.create({
      nombre,
      categoria,
      unidad_id,
      stock_minimo: Number(stock_minimo).toFixed(3),
      stock_actual: "0.000", // se setea luego del movimiento
      activo: true,
      meta:
        categoria === "Insumo"
          ? {
              ingrediente_activo: "N/A",
              formulacion: "N/A",
              proveedor: "Proveedor Demo",
            }
          : {},
    });

    // 2) Crear lote
    const hoy = new Date();
    const fecha_vencimiento =
      categoria === "Insumo"
        ? ymd(addDays(hoy, 180 + (idx % 90))) // entre ~180 y ~269 días
        : null;

    const codigo_lote_proveedor =
      categoria === "Insumo"
        ? `INS-${String(idx).padStart(3, "0")}`
        : categoria === "Herramienta"
          ? `HER-${String(idx).padStart(3, "0")}`
          : `EQU-${String(idx).padStart(3, "0")}`;

    const lote = await models.InventarioLote.create({
      item_id: item.id,
      codigo_lote_proveedor,
      fecha_vencimiento,
      cantidad_inicial: stock_inicial,
      cantidad_actual: stock_inicial,
      activo: true,
      observaciones: "Inventario inicial (seed)",
    });

    // 3) Movimiento ENTRADA (factor 1 porque usamos unidad base del ítem)
    await models.InventarioMovimiento.create({
      item_id: item.id,
      lote_id: lote.id,
      tipo: "ENTRADA",
      cantidad: stock_inicial,
      unidad_id: unidad_id,
      factor_a_unidad_base: "1.00000000",
      cantidad_en_base: stock_inicial,
      stock_resultante: stock_inicial,
      fecha: new Date(),
      motivo: "Inventario Inicial (seed)",
      referencia: { seed: true },
    });

    // 4) Actualizar stock maestro
    item.stock_actual = stock_inicial;
    await item.save();

    itemsCreados.push(item);
  };

  // 50 Insumos
  for (let i = 1; i <= 50; i++) {
    await crearItemConLoteYMovimiento({ categoria: "Insumo", idx: i });
  }

  // 50 Herramientas
  for (let i = 1; i <= 50; i++) {
    await crearItemConLoteYMovimiento({ categoria: "Herramienta", idx: i });
  }

  // 50 Equipos
  for (let i = 1; i <= 50; i++) {
    await crearItemConLoteYMovimiento({ categoria: "Equipo", idx: i });
  }

  // ==========================================================
  // ✅ 4.2 EXTRA: DATOS DE PRUEBA PARA REPORTES (FEFO + PRÉSTAMOS)
  // ==========================================================
  console.log("🧪 Generando datos de prueba para Reportes (FEFO + Préstamos)...");

  const hoy2 = new Date();

  // ---------- FEFO: 2 lotes próximos a vencer (10 y 25 días) ----------
  const insumoFefo = await models.InventarioItem.findOne({
    where: { categoria: "Insumo", activo: true },
    order: [["id", "ASC"]],
  });

  if (insumoFefo) {
    const lotesFefo = [
      { dias: 10, codigo: "FEFO-10D", qty: "5.000" },
      { dias: 25, codigo: "FEFO-25D", qty: "8.000" },
    ];

    let stockActual = Number(insumoFefo.stock_actual || 0);

    for (const lf of lotesFefo) {
      const fv = ymd(addDays(hoy2, lf.dias));

      const lote = await models.InventarioLote.create({
        item_id: insumoFefo.id,
        // evita choque con unique (item + codigo + venc)
        codigo_lote_proveedor: `${lf.codigo}-${String(insumoFefo.id).padStart(3, "0")}`,
        fecha_vencimiento: fv,
        cantidad_inicial: lf.qty,
        cantidad_actual: lf.qty,
        activo: true,
        observaciones: `Lote FEFO test (vence en ${lf.dias} días)`,
      });

      await models.InventarioMovimiento.create({
        item_id: insumoFefo.id,
        lote_id: lote.id,
        tipo: "ENTRADA",
        cantidad: lf.qty,
        unidad_id: insumoFefo.unidad_id, // unidad base del item
        factor_a_unidad_base: "1.00000000",
        cantidad_en_base: lf.qty,
        stock_resultante: (stockActual + Number(lf.qty)).toFixed(3),
        fecha: new Date(),
        motivo: "Entrada FEFO test (seed)",
        referencia: { seed: true, fefo_test: true },
      });

      stockActual += Number(lf.qty);
    }

    insumoFefo.stock_actual = stockActual.toFixed(3);
    await insumoFefo.save();
  } else {
    console.log("⚠️ No se encontró un Insumo para crear FEFO test.");
  }

  // ---------- PRÉSTAMO: 1 herramienta prestada + movimiento PRESTAMO_SALIDA ----------
  const herramienta = await models.InventarioItem.findOne({
    where: { categoria: "Herramienta", activo: true },
    order: [["id", "ASC"]],
  });

  if (herramienta && trabajadores?.length) {
    const loteHerr = await models.InventarioLote.findOne({
      where: { item_id: herramienta.id, activo: true },
      order: [["id", "ASC"]],
    });

    const usuarioPrestamo = trabajadores[0];
    const fechaSalida = addDays(hoy2, -6); // hace 6 días

    const prestamo = await models.HerramientaPrestamo.create({
      item_id: herramienta.id,
      usuario_id: usuarioPrestamo.id,
      estado: "Prestada",
      fecha_salida: fechaSalida,
      fecha_devolucion: null,
      observacion: "Préstamo test (seed) para Reportes",
    });

    const stockAntes = Number(herramienta.stock_actual || 0);
    const salida = 1.0;
    const stockDespues = Math.max(0, stockAntes - salida);

    await models.InventarioMovimiento.create({
      item_id: herramienta.id,
      lote_id: loteHerr?.id || null,
      tipo: "PRESTAMO_SALIDA",
      cantidad: salida.toFixed(3),
      unidad_id: herramienta.unidad_id,
      factor_a_unidad_base: "1.00000000",
      cantidad_en_base: salida.toFixed(3),
      stock_resultante: stockDespues.toFixed(3),
      fecha: fechaSalida,
      motivo: "Préstamo de herramienta (seed)",
      referencia: { prestamo_id: prestamo.id, usuario_id: usuarioPrestamo.id, seed: true },
    });

    herramienta.stock_actual = stockDespues.toFixed(3);
    await herramienta.save();
  } else {
    console.log("⚠️ No se encontró herramienta o no hay trabajadores para préstamo test.");
  }

  console.log("✅ Datos de prueba FEFO + Préstamo generados.");

  console.log(`✅ Roles: ${Object.keys(roles).length}`);
  console.log(`✅ Unidades: ${unidadesBase.length}`);
  console.log(`✅ TiposActividad: ${listaTipos.length}`);
  console.log(
    `✅ Usuarios creados: ${usuariosCreados.length} (Prop: ${propietarios.length}, Tec: ${tecnicos.length}, Tra: ${trabajadores.length})`
  );
  console.log(`✅ InventarioItems creados: ${itemsCreados.length} (Insumos: 50, Herramientas: 50, Equipos: 50)`);

  console.log("✅ Seed Maestro completado con éxito.");
};
