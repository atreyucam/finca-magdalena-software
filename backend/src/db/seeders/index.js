/**
 * SEED MAESTRO - SISTEMA DE GESTIÓN AGRONÓMICA (JSONB)
 * ----------------------------------------------------------------------
 * Genera un entorno completo de pruebas con histórico para reportes.
 * CORREGIDO FINAL: ENUMs exactos (Cosecha/Recuperación) y consistencia matemática.
 */

module.exports = async function runSeed(models) {
  const { hashPassword } = require("../../utils/crypto"); 

  // Configuración
  const RESET = true; 
  if (process.env.NODE_ENV === "production") throw new Error("❌ NO EJECUTAR EN PROD");

  console.log("🌱 Seed Maestro (Arquitectura JSONB): Iniciando...");

  // --- HELPERS ---
  const daysFromNow = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
  };

  // 1. LIMPIEZA DE BASE DE DATOS
  if (RESET) {
    console.log("🧹 Limpiando base de datos...");
    const tables = [
      models.NominaDetalle, models.NominaSemana,
      models.InventarioMovimiento, models.HerramientaPrestamo, models.InventarioLote, 
      models.TareaAsignacion, models.TareaItem, models.Novedad, 
      models.Tarea, 
      models.InventarioItem, models.PeriodoCosecha, models.Cosecha, 
      models.Lote, models.Finca,
      models.Usuario, models.TipoActividad, models.Unidad, models.Role
    ];
    for (const m of tables) {
      if (m) await m.destroy({ where: {}, truncate: true, cascade: true, restartIdentity: true });
    }
  }

  // 2. CATALOGOS BASE
  console.log("🏗️ Creando catálogos...");
  
  const roles = {};
  for (const r of ["Propietario", "Tecnico", "Trabajador"]) roles[r] = await models.Role.create({ nombre: r });

  const u = {};
  for (const k of ["kg", "g", "l", "ml", "gal", "unidad"]) {
    u[k] = await models.Unidad.create({ codigo: k, nombre: k.toUpperCase() });
  }

  const tipos = {}; 
  const listaTipos = [
    ["poda", "Poda"], 
    ["maleza", "Manejo de malezas"], 
    ["nutricion", "Nutrición"],
    ["fitosanitario", "Protección Fitosanitaria"],
    ["enfundado", "Enfundado"],
    ["cosecha", "Cosecha"]
  ];
  for (const [code, name] of listaTipos) {
    tipos[code] = await models.TipoActividad.create({ codigo: code, nombre: name });
  }

  // 3. USUARIOS
  console.log("👥 Creando usuarios...");
  const pass = await hashPassword("123456");
  
  const admin = await models.Usuario.create({
    cedula: "0101010101", nombres: "Carlos", apellidos: "Propietario", email: "admin@finca.test",
    role_id: roles.Propietario.id, password_hash: pass, estado: "Activo", tipo: "Fijo"
  });
  const tecnico = await models.Usuario.create({
    cedula: "0202020202", nombres: "Roberto", apellidos: "Técnico", email: "tecnico@finca.test",
    role_id: roles.Tecnico.id, password_hash: pass, estado: "Activo", tipo: "Fijo"
  });
  const juan = await models.Usuario.create({
    cedula: "0303030303", nombres: "Juan", apellidos: "Pérez", email: "juan@finca.test",
    role_id: roles.Trabajador.id, password_hash: pass, estado: "Activo", tipo: "Fijo"
  });
  const maria = await models.Usuario.create({
    cedula: "0404040404", nombres: "María", apellidos: "Gómez", email: "maria@finca.test",
    role_id: roles.Trabajador.id, password_hash: pass, estado: "Activo", tipo: "Fijo"
  });

  // // 4. INVENTARIO (ITEMS)
  // console.log("📦 Creando inventario...");
  // const itemFertilizante = await models.InventarioItem.create({ nombre: "Urea 46%", categoria: "Insumo", unidad_id: u.kg.id });
  // const itemFungicida = await models.InventarioItem.create({ nombre: "Fungicida X", categoria: "Insumo", unidad_id: u.l.id });
  
  // // Stock Inicial con cálculos requeridos
  // await models.InventarioMovimiento.create({ 
  //   item_id: itemFertilizante.id, 
  //   tipo: 'ENTRADA', 
  //   cantidad: 500, 
  //   fecha: daysFromNow(-60), 
  //   unidad_id: u.kg.id, 
  //   motivo: 'Compra Inicial',
  //   factor_a_unidad_base: 1, 
  //   cantidad_en_base: 500,
  //   stock_resultante: 500 
  // });

  // await models.InventarioMovimiento.create({ 
  //   item_id: itemFungicida.id, 
  //   tipo: 'ENTRADA', 
  //   cantidad: 100, 
  //   fecha: daysFromNow(-60), 
  //   unidad_id: u.l.id, 
  //   motivo: 'Compra Inicial',
  //   factor_a_unidad_base: 1,
  //   cantidad_en_base: 100,
  //   stock_resultante: 100
  // });

  // // 5. FINCAS Y LOTES
  // console.log("🚜 Creando Fincas y Lotes...");
  
  // const fincasData = [
  //   { nombre: "Finca La Magdalena", lotes: [
  //       { nombre: "Lote 1 (Entrada)", ha: 2.5 },
  //       { nombre: "Lote 2 (Río)", ha: 3.0 },
  //       { nombre: "Lote 3 (Alto)", ha: 1.5 },
  //       { nombre: "Lote 4 (Nuevo)", ha: 1.0 }
  //   ]},
  //   { nombre: "Finca RosaMaria", lotes: [
  //       { nombre: "Lote A", ha: 5.0 },
  //       { nombre: "Lote B", ha: 4.5 },
  //       { nombre: "Lote C", ha: 5.0 },
  //       { nombre: "Lote D", ha: 2.0 }
  //   ]}
  // ];

  // const dbContext = []; 

  // for (const fData of fincasData) {
  //   const finca = await models.Finca.create({ nombre: fData.nombre });
  //   const lotesCreados = [];
    
  //   for (const lData of fData.lotes) {
  //     const lote = await models.Lote.create({ 
  //       nombre: lData.nombre, 
  //       superficie_ha: lData.ha, 
  //       finca_id: finca.id, 
  //       estado: 'Activo' // ✅ CORRECTO: ENUM permitido
  //     });
  //     lotesCreados.push(lote);
  //   }
  //   dbContext.push({ finca, lotes: lotesCreados });
  // }

  // // 6. COSECHAS, PERIODOS Y TAREAS
  // console.log("📅 Generando Historial de Cosechas, Periodos y Tareas...");

  // for (const ctx of dbContext) {
  //   const ciclos = [
  //     { estado: 'Cerrada', codigo: `H1-2024-${ctx.finca.id}`, dias_atras: 180, fin_dias_atras: 150 },
  //     { estado: 'Activa',  codigo: `H1-2025-${ctx.finca.id}`, dias_atras: 15, fin_dias_atras: null }
  //   ];

  //   for (const ciclo of ciclos) {
  //     const cosecha = await models.Cosecha.create({
  //       nombre: `Cosecha ${ciclo.codigo}`,
  //       numero: 1,
  //       codigo: ciclo.codigo,
  //       anio_agricola: "2024-2025",
  //       fecha_inicio: daysFromNow(-ciclo.dias_atras),
  //       fecha_fin: ciclo.fin_dias_atras ? daysFromNow(-ciclo.fin_dias_atras) : null,
  //       estado: ciclo.estado,
  //       finca_id: ctx.finca.id
  //     });

  //     // ✅ CORREGIDO: Usamos 'Cosecha/Recuperación' que es el valor exacto del ENUM
  //     const periodo = await models.PeriodoCosecha.create({
  //       cosecha_id: cosecha.id,
  //       nombre: 'Cosecha/Recuperación', 
  //       fecha_inicio: cosecha.fecha_inicio,
  //       fecha_fin: cosecha.fecha_fin || daysFromNow(30),
  //     });

  //     // Tareas Mantenimiento
  //     for (let i = 0; i < 2; i++) {
  //       const loteAleatorio = ctx.lotes[i % ctx.lotes.length];
  //       await models.Tarea.create({
  //         lote_id: loteAleatorio.id,
  //         cosecha_id: cosecha.id,
  //         periodo_id: periodo.id, 
  //         creador_id: admin.id,   
  //         tipo_id: tipos.poda.id,
  //         estado: 'Completada',
  //         fecha_programada: daysFromNow(-ciclo.dias_atras + 5),
  //         fecha_fin_real: daysFromNow(-ciclo.dias_atras + 6),
  //         duracion_real_min: 240,
  //         detalles: { notas: "Poda de mantenimiento estándar." }
  //       });
  //     }

  //     // Tarea FITOSANITARIA
  //     if (ciclo.estado === 'Activa') {
  //        await models.Tarea.create({
  //           lote_id: ctx.lotes[0].id,
  //           cosecha_id: cosecha.id,
  //           periodo_id: periodo.id,
  //           creador_id: admin.id, 
  //           tipo_id: tipos.fitosanitario.id,
  //           estado: 'Completada',
  //           fecha_programada: daysFromNow(-1),
  //           fecha_fin_real: daysFromNow(-1), 
  //           detalles: {
  //             plaga_enfermedad: "Hongo Botrytis",
  //             periodo_carencia_dias: 7, // 🔴 Semáforo Rojo
  //             periodo_reingreso_horas: 24
  //           }
  //        });
  //     }

  //     // Tarea COSECHA (Con matemática cuadrada para evitar "Descuadre")
  //     for (const lote of ctx.lotes) {
  //       // Cálculo matemático para que cuadre perfecto el reporte
  //       const kgPlan = lote.superficie_ha * 1000;
  //       const kgReal = kgPlan * 0.9; // 90% rendimiento
        
  //       const kgExport = kgReal * 0.70; // 70% Export
  //       const kgNac = kgReal * 0.20;    // 20% Nacional
  //       const kgRechazo1 = kgReal * 0.05; // 5% Hongo
  //       const kgRechazo2 = kgReal * 0.05; // 5% Mecánico
        
  //       // Ajuste de decimales para que SUM(Partes) == Total
  //       const totalCalculado = kgExport + kgNac + kgRechazo1 + kgRechazo2;

  //       await models.Tarea.create({
  //         lote_id: lote.id,
  //         cosecha_id: cosecha.id,
  //         periodo_id: periodo.id,
  //         creador_id: admin.id,
  //         tipo_id: tipos.cosecha.id,
  //         estado: 'Completada',
  //         fecha_programada: daysFromNow(-ciclo.dias_atras + 10),
  //         fecha_fin_real: daysFromNow(-ciclo.dias_atras + 10),
  //         detalles: {
  //           kg_planificados: kgPlan.toFixed(2),
  //           kg_cosechados: totalCalculado.toFixed(2), // Usamos el calculado para evitar decimales flotantes
  //           clasificacion: [
  //             { destino: "Exportación", kg: kgExport.toFixed(2) },
  //             { destino: "Nacional", kg: kgNac.toFixed(2) }
  //           ],
  //           rechazos: [
  //             { causa: "Hongo", kg: kgRechazo1.toFixed(2) },
  //             { causa: "Daño Mecánico", kg: kgRechazo2.toFixed(2) }
  //           ],
  //           entrega: { 
  //               gabetas_entregadas: 50,
  //               gabetas_devueltas: 50,
  //               centro_acopio: "Centro Palora"
  //           },
  //           total_dinero: (kgExport * 2.5 + kgNac * 0.5).toFixed(2) // $2.5 export, $0.5 nacional
  //         }
  //       });
  //     }
  //   }
  // }

  // // 7. NÓMINA Y COSTOS
  // console.log("💰 Generando Nómina y Consumos...");

  // const semanaNomina = await models.NominaSemana.create({
  //   semana_iso: "2025-W50",
  //   fecha_inicio: daysFromNow(-7),
  //   fecha_fin: daysFromNow(0),
  //   estado: 'Aprobada',
  //   creado_por_id: admin.id
  // });

  // await models.NominaDetalle.create({
  //   nomina_id: semanaNomina.id,
  //   trabajador_id: juan.id,
  //   dias_trabajados: 5,
  //   tareas_completadas: 10,
  //   monto_total: 600.00,
  //   monto_base: 300.00,
  //   detalles_json: { bono: 300 }
  // });

  // await models.NominaDetalle.create({
  //   nomina_id: semanaNomina.id,
  //   trabajador_id: maria.id,
  //   dias_trabajados: 5,
  //   tareas_completadas: 12,
  //   monto_total: 600.00,
  //   monto_base: 300.00,
  //   detalles_json: { bono: 300 }
  // });

  // // Salidas de Inventario
  // const loteF1 = dbContext[0].lotes[0]; 
  // const tareaReferencia = await models.Tarea.findOne({ where: { lote_id: loteF1.id } });

  // await models.InventarioMovimiento.create({
  //   item_id: itemFertilizante.id,
  //   unidad_id: u.kg.id,
  //   tipo: 'SALIDA',
  //   cantidad: 50, 
  //   fecha: new Date(),
  //   referencia: { tarea_id: tareaReferencia?.id || 1 },
  //   motivo: 'Fertilización Lote 1',
  //   factor_a_unidad_base: 1,
  //   cantidad_en_base: 50,
  //   stock_resultante: 450 
  // });

  console.log("✅ Seed Maestro completado con éxito.");
  console.log("📊 Datos listos para probar Reportes.");
};