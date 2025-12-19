// backend/src/modules/reportes/reportes.service.js
const { Op, Sequelize} = require('sequelize');
const { models, sequelize } = require('../../db');

// --- Helpers ---
function getDateRange(desde, hasta) {
  if (desde && hasta) return { [Op.between]: [new Date(desde), new Date(hasta)] };
  if (desde) return { [Op.gte]: new Date(desde) };
  return {};
}


/**
 * 🧠 Helper Privado: Ejecuta la consulta SQL pesada para una cosecha específica.
 * Extrae datos profundos del JSONB de tareas.
 */async function _getStatsSQL(cosechaId) {
  const sql = `
    SELECT 
      -- 1. Totales Generales
      COUNT(t.id) as num_tareas,
      SUM(COALESCE((t.detalles->>'kg_planificados')::numeric, 0)) as kg_plan,
      SUM(COALESCE((t.detalles->>'kg_cosechados')::numeric, 0)) as kg_real,
      
      -- 2. Calidad: Envolvemos la subconsulta en SUM() para agregar todas las filas
      SUM(
        COALESCE(
          (SELECT SUM(COALESCE((elem->>'kg')::numeric, 0))
           FROM jsonb_array_elements(t.detalles->'clasificacion') elem
           WHERE elem->>'destino' ILIKE '%Export%'),
        0)
      ) as kg_export,
       
      SUM(
        COALESCE(
          (SELECT SUM(COALESCE((elem->>'kg')::numeric, 0))
           FROM jsonb_array_elements(t.detalles->'clasificacion') elem
           WHERE elem->>'destino' ILIKE '%Nacional%'),
        0)
      ) as kg_nacional,

      -- 3. Rechazos (Total Kg)
      SUM(
        COALESCE(
          (SELECT SUM(COALESCE((elem->>'kg')::numeric, 0))
           FROM jsonb_array_elements(t.detalles->'rechazos') elem),
        0)
      ) as kg_rechazo,

      -- 4. Logística (Gabetas)
      SUM(COALESCE((t.detalles->'entrega'->>'gabetas_entregadas')::numeric, 0)) as gabetas_enviadas,
      SUM(COALESCE((t.detalles->'entrega'->>'gabetas_devueltas')::numeric, 0)) as gabetas_recibidas,

      -- 5. Financiero (Liquidación)
      SUM(COALESCE((t.detalles->>'total_dinero')::numeric, 0)) as dinero_total

    FROM tareas t
    WHERE t.cosecha_id = :cosechaId
      AND t.estado IN ('Completada', 'Verificada');
  `;

  const [res] = await sequelize.query(sql, { 
    type: sequelize.QueryTypes.SELECT, 
    replacements: { cosechaId } 
  });

  // Si no hay tareas, res puede venir undefined o con valores nulos
  if (!res) {
      return {
        num_tareas: 0, kg_plan: 0, kg_real: 0, kg_export: 0, kg_nacional: 0, 
        kg_rechazo: 0, gabetas_enviadas: 0, gabetas_recibidas: 0, dinero_total: "0.00",
        porcentaje_cumplimiento: 0, porcentaje_exportable: 0
      };
  }

  // Calculamos porcentajes y limpiezas en JS
  const kgReal = Number(res.kg_real || 0);
  const kgExport = Number(res.kg_export || 0);
  
  return {
    ...res,
    kg_plan: Number(res.kg_plan || 0),
    kg_real: kgReal,
    kg_export: kgExport,
    kg_nacional: Number(res.kg_nacional || 0),
    kg_rechazo: Number(res.kg_rechazo || 0),
    // Evitar división por cero
    porcentaje_cumplimiento: Number(res.kg_plan) > 0 ? ((kgReal / Number(res.kg_plan)) * 100).toFixed(1) : 0,
    porcentaje_exportable: kgReal > 0 ? ((kgExport / kgReal) * 100).toFixed(1) : 0,
    dinero_total: Number(res.dinero_total || 0).toFixed(2)
  };
}

/**
 * 🏆 Helper Privado: Top Rendimiento Lotes (Kg/Ha)
 */
async function _getTopLotes(cosechaId) {
  const sql = `
    SELECT 
      l.nombre as lote,
      l.superficie_ha,
      SUM((t.detalles->>'kg_cosechados')::numeric) as kg,
      CASE 
        WHEN l.superficie_ha > 0 THEN 
          ROUND(SUM((t.detalles->>'kg_cosechados')::numeric) / l.superficie_ha, 2)
        ELSE 0 
      END as rendimiento
    FROM tareas t
    JOIN lotes l ON t.lote_id = l.id
    WHERE t.cosecha_id = :cosechaId 
      AND t.estado IN ('Completada', 'Verificada')
    GROUP BY l.id, l.nombre, l.superficie_ha
    ORDER BY rendimiento DESC;
  `;

  return await sequelize.query(sql, { 
    type: sequelize.QueryTypes.SELECT, 
    replacements: { cosechaId } 
  });
}

/**
 * 🧠 Helper Privado: Desglose de Causas de Rechazo (Pareto)
 */
async function _getAnalisisRechazos(cosechaId) {
  const sql = `
    SELECT 
      elem->>'causa' as causa,
      SUM((elem->>'kg')::numeric) as total_kg
    FROM tareas t,
    jsonb_array_elements(t.detalles->'rechazos') elem
    WHERE t.cosecha_id = :cosechaId 
      AND t.estado IN ('Completada', 'Verificada')
    GROUP BY causa
    ORDER BY total_kg DESC;
  `;
  return await sequelize.query(sql, { 
    type: sequelize.QueryTypes.SELECT, 
    replacements: { cosechaId } 
  });
}

// ================= EXPORTABLE =================

exports.getRendimientoCosecha = async ({ cosecha_id, comparar_id }) => {
  // 1. Resolver ID de cosecha principal
  let targetId = cosecha_id;
  if (!targetId) {
    const activa = await models.Cosecha.findOne({ where: { estado: 'Activa' } });
    targetId = activa ? activa.id : null;
  }
  
  if (!targetId) return { message: "No se encontró una cosecha activa o seleccionada." };

  const infoCosecha = await models.Cosecha.findByPk(targetId, {
      include: [{ model: models.Finca, attributes: ['nombre'] }]
  });

  // 2. Ejecutar Consultas en Paralelo para velocidad
  const [general, topLotes, causasRechazo] = await Promise.all([
    _getStatsSQL(targetId),
    _getTopLotes(targetId),
    _getAnalisisRechazos(targetId)
  ]);

  // 3. (Opcional) Comparativa
  let comparativa = null;
  if (comparar_id) {
    comparativa = await _getStatsSQL(comparar_id);
  }

  return {
    cosecha: {
        id: infoCosecha.id,
        codigo: infoCosecha.codigo,
        finca: infoCosecha.Finca?.nombre
    },
    indicadores_clave: general, // Plan, Real, Calidad, $$
    analisis_calidad: {
        rechazos_pareto: causasRechazo // Array para gráfico de barras
    },
    ranking_lotes: topLotes, // Array para tabla o gráfico de barras
    comparativa: comparativa // null o objeto con datos anteriores
  };
};



/**
 * 🛡️ REPORTE FITOSANITARIO (Semáforo BPA)
 */
exports.getFitosanitarioStats = async ({ finca_id }) => {
  // 1. Buscamos la ÚLTIMA aplicación fitosanitaria por lote
  // Usamos SQL nativo para poder operar fechas con JSONB
  const sql = `
    SELECT 
      l.id as lote_id,
      l.nombre as lote,
      MAX(t.fecha_fin_real) as ultima_aplicacion,
      
      -- Extraemos datos del JSONB de la última tarea encontrada
      (SELECT detalles->>'plaga_enfermedad' FROM tareas t2 WHERE t2.id = MAX(t.id)) as plaga,
      (SELECT detalles->>'producto_comercial' FROM tareas t2 WHERE t2.id = MAX(t.id)) as producto, -- Si lo guardas
      (SELECT (detalles->>'periodo_carencia_dias')::int FROM tareas t2 WHERE t2.id = MAX(t.id)) as carencia_dias,
      (SELECT (detalles->>'periodo_reingreso_horas')::int FROM tareas t2 WHERE t2.id = MAX(t.id)) as reingreso_horas

    FROM tareas t
    JOIN lotes l ON t.lote_id = l.id
    JOIN tipos_actividad ta ON t.tipo_id = ta.id
    WHERE l.finca_id = :finca_id
      AND ta.codigo = 'FITO' 
      AND t.estado IN ('Completada', 'Verificada')
    GROUP BY l.id, l.nombre
  `;

  const rows = await sequelize.query(sql, { 
    type: sequelize.QueryTypes.SELECT, 
    replacements: { finca_id } 
  });

  // 2. Procesamos en JS para determinar el estado (Semáforo)
  const hoy = new Date();
  
  return rows.map(r => {
    const fechaApp = new Date(r.ultima_aplicacion);
    
    // Cálculo Cosecha (Carencia)
    const fechaLiberacionCosecha = new Date(fechaApp);
    fechaLiberacionCosecha.setDate(fechaLiberacionCosecha.getDate() + (r.carencia_dias || 0));
    const diasRestantes = Math.ceil((fechaLiberacionCosecha - hoy) / (1000 * 60 * 60 * 24));
    
    // Cálculo Reingreso (Entrada personal)
    const fechaLiberacionEntrada = new Date(fechaApp);
    fechaLiberacionEntrada.setHours(fechaLiberacionEntrada.getHours() + (r.reingreso_horas || 0));
    const puedeEntrar = hoy >= fechaLiberacionEntrada;

    return {
      lote: r.lote,
      ultima_aplicacion: r.ultima_aplicacion,
      plaga_objetivo: r.plaga,
      dias_carencia_teorico: r.carencia_dias,
      
      // 🚦 SEMÁFORO COSECHA
      estado_cosecha: diasRestantes > 0 ? 'BLOQUEADO' : 'LIBRE',
      dias_para_cosechar: diasRestantes > 0 ? diasRestantes : 0,
      
      // 🚦 SEMÁFORO REINGRESO
      estado_reingreso: puedeEntrar ? 'SEGURO' : 'PELIGRO',
      horas_reingreso_teorico: r.reingreso_horas
    };
  });
};

/**
 * 📋 REPORTE OPERATIVO (Tareas)
 */
exports.getOperacionesStats = async ({ finca_id, desde, hasta }) => {
  const whereFecha = (desde && hasta) 
    ? `AND t.fecha_programada BETWEEN :desde AND :hasta` 
    : '';

  // 1. Resumen por Estado
  const sqlEstados = `
    SELECT 
      t.estado, 
      COUNT(*) as total 
    FROM tareas t
    JOIN lotes l ON t.lote_id = l.id
    WHERE l.finca_id = :finca_id ${whereFecha}
    GROUP BY t.estado
  `;

  // 2. Resumen por Tipo de Actividad
  const sqlTipos = `
    SELECT 
      ta.nombre as actividad,
      COUNT(*) as total,
      AVG(t.duracion_real_min)::numeric(10,2) as tiempo_promedio_min
    FROM tareas t
    JOIN lotes l ON t.lote_id = l.id
    JOIN tipos_actividad ta ON t.tipo_id = ta.id
    WHERE l.finca_id = :finca_id ${whereFecha}
    GROUP BY ta.nombre
  `;

  // 3. Tareas Atrasadas (Programada < Real)
  // Contamos tareas completadas donde la fecha real fue después de la programada (mismo día se perdona)
  const sqlAtrasos = `
    SELECT COUNT(*) as total
    FROM tareas t
    JOIN lotes l ON t.lote_id = l.id
    WHERE l.finca_id = :finca_id ${whereFecha}
      AND t.estado IN ('Completada', 'Verificada')
      AND t.fecha_fin_real::date > t.fecha_programada::date
  `;

  const [estados, tipos, atrasos] = await Promise.all([
    sequelize.query(sqlEstados, { type: sequelize.QueryTypes.SELECT, replacements: { finca_id, desde, hasta } }),
    sequelize.query(sqlTipos, { type: sequelize.QueryTypes.SELECT, replacements: { finca_id, desde, hasta } }),
    sequelize.query(sqlAtrasos, { type: sequelize.QueryTypes.SELECT, replacements: { finca_id, desde, hasta } })
  ]);

  return {
    por_estado: estados,
    por_tipo: tipos, // Incluye duración promedio
    metricas_clave: {
      total_atrasadas: Number(atrasos[0]?.total || 0)
    }
  };
};


/**
 * 💸 REPORTE DE COSTOS OPERATIVOS
 * Responde: ¿En qué gastamos el dinero y los recursos?
 */
exports.getCostosOperativos = async ({ finca_id, desde, hasta }) => {
  // Filtros de fecha básicos
  const whereFechaTareas = (desde && hasta) 
    ? `AND t.fecha_programada BETWEEN :desde AND :hasta` : '';
  
  const whereFechaNomina = (desde && hasta) 
    ? `AND ns.fecha_inicio BETWEEN :desde AND :hasta` : '';

  const whereFechaMovs = (desde && hasta) 
    ? `AND m.fecha BETWEEN :desde AND :hasta` : '';

  // ---------------------------------------------------------
  // 1. GASTO LABORAL TOTAL (Dinero Real Pagado)
  // ---------------------------------------------------------
  const sqlNominaTotal = `
    SELECT COALESCE(SUM(nd.monto_total), 0) as total_pagado
    FROM nomina_detalles nd
    JOIN nomina_semanas ns ON nd.nomina_id = ns.id
    -- Aquí podríamos filtrar por usuarios que trabajaron en la finca, 
    -- pero para simplificar asumimos que la nómina es global o se filtra por fecha.
    WHERE ns.estado = 'Aprobada' ${whereFechaNomina}
  `;
  
  const [resNomina] = await sequelize.query(sqlNominaTotal, { 
    type: sequelize.QueryTypes.SELECT, 
    replacements: { desde, hasta } 
  });
  const totalNomina = Number(resNomina?.total_pagado || 0);

  // ---------------------------------------------------------
  // 2. DISTRIBUCIÓN DEL ESFUERZO (Para prorratear el costo)
  // ---------------------------------------------------------
  /* Calculamos qué % de las tareas completadas pertenece a cada Tipo de Actividad 
     y a cada Lote para asignar el costo proporcionalmente.
  */
  const sqlDistribucion = `
    SELECT 
      l.id as lote_id,
      l.nombre as lote,
      l.superficie_ha,
      ta.nombre as actividad,
      COUNT(t.id) as num_tareas
    FROM tareas t
    JOIN lotes l ON t.lote_id = l.id
    JOIN tipos_actividad ta ON t.tipo_id = ta.id
    WHERE l.finca_id = :finca_id 
      AND t.estado IN ('Completada', 'Verificada')
      ${whereFechaTareas}
    GROUP BY l.id, l.nombre, l.superficie_ha, ta.nombre
  `;

  const distRows = await sequelize.query(sqlDistribucion, { 
    type: sequelize.QueryTypes.SELECT, 
    replacements: { finca_id, desde, hasta } 
  });

  // Calcular el total de tareas en el periodo para sacar porcentajes
  const totalTareasPeriodo = distRows.reduce((acc, r) => acc + Number(r.num_tareas), 0);

  // ---------------------------------------------------------
  // 3. CONSUMO DE INSUMOS (Inventario Real)
  // ---------------------------------------------------------
  // Vinculamos movimientos de inventario con tareas de esta finca usando el campo 'referencia'
  const sqlInsumos = `
    SELECT 
      ii.nombre as insumo,
      u.codigo as unidad,
      SUM(m.cantidad) as total_cantidad
    FROM inventario_movimientos m
    JOIN inventario_items ii ON m.item_id = ii.id
    JOIN unidades u ON m.unidad_id = u.id
    -- Join implícito a tareas vía JSONB referencia
    JOIN tareas t ON (m.referencia->>'tarea_id')::int = t.id
    JOIN lotes l ON t.lote_id = l.id
    WHERE m.tipo = 'SALIDA'
      AND l.finca_id = :finca_id
      ${whereFechaMovs}
    GROUP BY ii.nombre, u.codigo
    ORDER BY total_cantidad DESC
  `;

  const insumosRows = await sequelize.query(sqlInsumos, { 
    type: sequelize.QueryTypes.SELECT, 
    replacements: { finca_id, desde, hasta } 
  });

  // =========================================================
  // 4. PROCESAMIENTO DE DATOS (La magia del ABC)
  // =========================================================

  // A. Gasto por Actividad (Gráfico de Torta)
  const gastoPorActividad = {};
  
  // B. Costo Laboral por Hectárea (Eficiencia)
  const costoPorLote = {};

  distRows.forEach(row => {
    // Factor de Prorrateo: (Tareas de esta fila / Total Tareas)
    const factor = totalTareasPeriodo > 0 ? (Number(row.num_tareas) / totalTareasPeriodo) : 0;
    const costoAsignado = totalNomina * factor;

    // A. Agrupar por Actividad
    if (!gastoPorActividad[row.actividad]) gastoPorActividad[row.actividad] = 0;
    gastoPorActividad[row.actividad] += costoAsignado;

    // B. Agrupar por Lote
    if (!costoPorLote[row.lote]) {
        costoPorLote[row.lote] = { 
            costo_total: 0, 
            hectareas: Number(row.superficie_ha) 
        };
    }
    costoPorLote[row.lote].costo_total += costoAsignado;
  });

  // Formatear Salidas
  const pieChartLabels = [];
  const pieChartSeries = [];
  for (const [actividad, costo] of Object.entries(gastoPorActividad)) {
      pieChartLabels.push(actividad);
      pieChartSeries.push(Number(costo.toFixed(2)));
  }

  const eficienciaLotes = Object.entries(costoPorLote).map(([lote, datos]) => ({
      lote,
      costo_total_asignado: Number(datos.costo_total.toFixed(2)),
      hectareas: datos.hectareas,
      // KPI CLAVE: Costo / Ha
      costo_por_ha: datos.hectareas > 0 
        ? Number((datos.costo_total / datos.hectareas).toFixed(2)) 
        : 0
  })).sort((a,b) => b.costo_por_ha - a.costo_por_ha); // Los más caros primero

  return {
    periodo: { desde, hasta },
    total_nomina_periodo: totalNomina.toFixed(2),
    
    // KPI 1: Distribución Gasto Laboral
    distribucion_gasto: {
        labels: pieChartLabels,
        series: pieChartSeries // Para gráfico de pastel
    },

    // KPI 2: Eficiencia de Costos por Lote
    costos_por_lote: eficienciaLotes,

    // KPI 3: Consumo de Insumos
    consumo_insumos: insumosRows.map(i => ({
        insumo: i.insumo,
        cantidad: Number(i.total_cantidad),
        unidad: i.unidad
    }))
  };
};


/**
 * 🚀 DASHBOARD INTEGRAL (La "Gestión Integral")
 * Resumen ejecutivo de: Operaciones, Seguridad, Dinero y Producción.
 */
exports.getDashboardKPIs = async ({ finca_id }) => {
  const whereFinca = finca_id ? `AND l.finca_id = :finca_id` : '';
  const hoy = new Date();
  
  // Definir rango del mes actual para costos
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);

  // 1. 🚨 SEGURIDAD (Del reporte Fitosanitario)
  // Contamos cuántos lotes están BLOQUEADOS hoy por carencia
  const sqlSeguridad = `
    SELECT COUNT(DISTINCT l.id) as lotes_bloqueados
    FROM tareas t
    JOIN lotes l ON t.lote_id = l.id
    WHERE t.estado IN ('Completada', 'Verificada')
      AND (t.detalles->>'periodo_carencia_dias')::int > 0
      -- Fecha Fin + Carencia > Hoy
      AND (t.fecha_fin_real::date + (t.detalles->>'periodo_carencia_dias')::int) > CURRENT_DATE
      ${whereFinca}
  `;

  // 2. 💰 FINANZAS (Del reporte de Costos)
  // Gasto de nómina acumulado ESTE MES
  const sqlGastoMes = `
    SELECT COALESCE(SUM(nd.monto_total), 0) as gasto_mes
    FROM nomina_detalles nd
    JOIN nomina_semanas ns ON nd.nomina_id = ns.id
    -- Aquí simplificamos asumiendo que el gasto es general, 
    -- si la nómina no tiene finca_id directo, se prorratea o se asume global si no hay filtro finca
    WHERE ns.estado = 'Aprobada'
      AND ns.fecha_inicio BETWEEN :inicioMes AND :finMes
  `;

  // 3. ⚖️ PRODUCCIÓN (Del reporte de Rendimiento)
  // Kilos cosechados en la campaña ACTIVA
  const sqlProduccion = `
    SELECT 
      COALESCE(SUM((t.detalles->>'kg_cosechados')::numeric), 0) as kg_total,
      -- % Exportación rápido
      COALESCE(SUM(
        (SELECT SUM((elem->>'kg')::numeric) 
         FROM jsonb_array_elements(t.detalles->'clasificacion') elem 
         WHERE elem->>'destino' ILIKE '%Export%')
      ), 0) as kg_export
    FROM tareas t
    JOIN cosechas c ON t.cosecha_id = c.id
    JOIN lotes l ON t.lote_id = l.id
    WHERE c.estado = 'Activa'
      AND t.estado IN ('Completada', 'Verificada')
      ${whereFinca}
  `;

  // 4. 🚜 OPERATIVO (Lo que ya tenías)
  // Tareas pendientes urgentes (atrasadas)
  const sqlOperativo = `
    SELECT COUNT(*) as tareas_atrasadas
    FROM tareas t
    JOIN lotes l ON t.lote_id = l.id
    WHERE t.estado IN ('Pendiente', 'Asignada', 'En progreso')
      AND t.fecha_programada < CURRENT_DATE
      ${whereFinca}
  `;

  // Ejecución paralela
  const [resSeguridad, resGasto, resProd, resOps] = await Promise.all([
    sequelize.query(sqlSeguridad, { type: sequelize.QueryTypes.SELECT, replacements: { finca_id } }),
    sequelize.query(sqlGastoMes, { type: sequelize.QueryTypes.SELECT, replacements: { inicioMes, finMes } }),
    sequelize.query(sqlProduccion, { type: sequelize.QueryTypes.SELECT, replacements: { finca_id } }),
    sequelize.query(sqlOperativo, { type: sequelize.QueryTypes.SELECT, replacements: { finca_id } })
  ]);

  const prodTotal = Number(resProd[0]?.kg_total || 0);
  const prodExport = Number(resProd[0]?.kg_export || 0);

  return {
    kpi_seguridad: {
      lotes_bloqueados: Number(resSeguridad[0]?.lotes_bloqueados || 0),
      mensaje: Number(resSeguridad[0]?.lotes_bloqueados) > 0 ? '⚠️ Lotes en carencia' : '✅ Todo seguro'
    },
    kpi_finanzas: {
      gasto_mes_actual: Number(resGasto[0]?.gasto_mes || 0).toFixed(2),
      moneda: 'USD'
    },
    kpi_produccion: {
      kg_totales_campana: prodTotal,
      porcentaje_exportable: prodTotal > 0 ? Math.round((prodExport / prodTotal) * 100) : 0
    },
    kpi_operativo: {
      tareas_atrasadas: Number(resOps[0]?.tareas_atrasadas || 0),
      estado_general: Number(resOps[0]?.tareas_atrasadas) > 5 ? 'Crítico' : 'Normal'
    }
  };
};























































































// /**
//  * 1. DASHBOARD EJECUTIVO (KPIs)
//  * Responde: "¿Cómo está la finca hoy?"
//  */
// exports.getDashboardKPIs = async () => {
//   const hoy = new Date();
//   const inicioDia = new Date(hoy.setHours(0,0,0,0));
//   const finDia = new Date(hoy.setHours(23,59,59,999));

//   // A. Tareas Pendientes vs Totales (Estado actual)
//   const tareasEstado = await models.Tarea.findAll({
//     attributes: ['estado', [Sequelize.fn('COUNT', 'id'), 'total']],
//     group: ['estado'],
//     raw: true
//   });

//   // B. Personal Activo Hoy (Tareas en progreso o completadas hoy)
//   const personalHoy = await models.TareaEstado.count({
//     distinct: true,
//     col: 'usuario_id',
//     where: {
//       fecha: { [Op.between]: [inicioDia, finDia] },
//       estado: { [Op.in]: ['En progreso', 'Completada'] }
//     }
//   });

//   // C. Cosecha Campaña Activa (Kg Totales)
//   const [cosecha] = await sequelize.query(`
//     SELECT COALESCE(SUM((t.detalles->>'kg_cosechados')::numeric), 0) as total_kg
//     FROM tareas t
//     JOIN cosechas c ON t.cosecha_id = c.id
//     WHERE c.estado = 'Activa' AND t.estado IN ('Completada', 'Verificada')
//   `);

//   // D. Alertas Stock Bajo
//   const stockBajo = await models.InventarioItem.count({
//     where: { 
//       activo: true,
//       stock_actual: { [Op.lt]: Sequelize.col('stock_minimo') }
//     }
//   });

//   return {
//     resumen_tareas: tareasEstado,
//     personal_trabajando_hoy: personalHoy,
//     cosecha_activa_kg: parseFloat(cosecha[0]?.total_kg || 0),
//     alertas_stock: stockBajo
//   };
// };

// /**
//  * 2. RENDIMIENTO DE COSECHA (Comparativo)
//  * Responde: "¿Qué lote rinde más? ¿Cómo vamos vs la cosecha anterior?"
//  */
// exports.getCosechaStats = async ({ cosecha_id, comparar_id }) => {
//   // Si no envían ID, buscamos la activa
//   let targetId = cosecha_id;
//   if (!targetId) {
//     const activa = await models.Cosecha.findOne({ where: { estado: 'Activa' } });
//     targetId = activa ? activa.id : null;
//   }

//   if (!targetId) return { message: "No hay cosecha activa ni seleccionada" };

//   // Helper para sacar stats de una cosecha específica
//   const getStats = async (cId) => {
//     const query = `
//       SELECT 
//         l.nombre as lote,
//         COUNT(t.id) as num_cortes,
//         SUM((t.detalles->>'kg_cosechados')::numeric) as total_kg,
//         AVG((t.detalles->>'grado_madurez_promedio')::numeric)::numeric(10,2) as madurez_promedio,
//         -- Extraemos calidad del array JSONB (ejemplo simplificado: suma total rechazo)
//         (
//           SELECT SUM((elem->>'kg')::numeric)
//           FROM jsonb_array_elements(t.detalles->'rechazos') elem
//         ) as total_rechazo
//       FROM tareas t
//       JOIN lotes l ON t.lote_id = l.id
//       WHERE t.cosecha_id = :cId
//         AND t.estado IN ('Completada', 'Verificada')
//         AND (t.detalles->>'kg_cosechados') IS NOT NULL
//       GROUP BY l.nombre, t.detalles
//     `;
//     const [rows] = await sequelize.query(query, { replacements: { cId } });
    
//     // Agrupar por lote (el query raw puede traer filas por tarea si el group by no es estricto, refinamos en JS)
//     const porLote = {};
//     let totalKg = 0;
    
//     rows.forEach(r => {
//       if(!porLote[r.lote]) porLote[r.lote] = { lote: r.lote, kg: 0, rechazo: 0 };
//       const k = Number(r.total_kg || 0);
//       const rec = Number(r.total_rechazo || 0);
//       porLote[r.lote].kg += k;
//       porLote[r.lote].rechazo += rec;
//       totalKg += k;
//     });

//     return { 
//       id: cId, 
//       total_kg: totalKg, 
//       desglose: Object.values(porLote) 
//     };
//   };

//   const actual = await getStats(targetId);
//   let comparativa = null;

//   if (comparar_id) {
//     comparativa = await getStats(comparar_id);
//   }

//   return {
//     analisis: actual,
//     comparativa: comparativa
//   };
// };

// /**
//  * 3. BITÁCORA DE LOTE (Historial)
//  * Responde: "¿Qué se hizo en este lote?"
//  */
// exports.getBitacoraLote = async (loteId, { cosecha_id, limit = 50 }) => {
//   const where = { 
//     lote_id: loteId,
//     estado: ['Completada', 'Verificada']
//   };
  
//   if (cosecha_id) where.cosecha_id = cosecha_id;

//   const historial = await models.Tarea.findAll({
//     where,
//     include: [
//       { model: models.TipoActividad, attributes: ['nombre', 'codigo'] },
//       { model: models.Usuario, as: 'Creador', attributes: ['nombres', 'apellidos'] },
//       { model: models.Cosecha, attributes: ['nombre'] } // Saber a qué campaña perteneció
//     ],
//     order: [['fecha_programada', 'DESC']],
//     limit: Number(limit)
//   });

//   return historial.map(t => {
//     const d = t.detalles || {};
//     const tipo = t.TipoActividad?.codigo.toLowerCase();
//     let resumen = "Sin detalles";

//     // Generador de Resumen Inteligente
//     if (tipo === 'fitosanitario') resumen = `Aplicación: ${d.plaga_enfermedad}. Carencia: ${d.periodo_carencia_dias} días.`;
//     else if (tipo === 'nutricion') resumen = `Fertilización ${d.metodo_aplicacion}.`;
//     else if (tipo === 'cosecha') resumen = `Cosecha: ${d.kg_cosechados} Kg.`;
//     else if (tipo === 'poda') resumen = `Poda tipo ${d.tipo}.`;
//     else if (tipo === 'maleza') resumen = `Control ${d.metodo}.`;

//     return {
//       id: t.id,
//       fecha: t.fecha_programada, // O fecha_fin_real si prefieres exactitud
//       actividad: t.TipoActividad?.nombre,
//       cosecha: t.Cosecha?.nombre,
//       responsable: `${t.Creador?.nombres} ${t.Creador?.apellidos}`,
//       resumen_tecnico: resumen,
//       estado: t.estado,
//       json_completo: d
//     };
//   });
// };

// /**
//  * 4. EFICIENCIA DE INSUMOS
//  * Responde: "¿Cuánto gastamos?"
//  */

// exports.getInsumosStats = async ({ desde, hasta }) => {
//   const range = getDateRange(desde, hasta);
//   const whereFecha = Object.keys(range).length > 0 ? { fecha: range } : {}; // ✅ Asignación explícita a 'fecha'

//   const consumos = await models.InventarioMovimiento.findAll({
//     attributes: [
//       [Sequelize.col('InventarioItem.nombre'), 'insumo'],
//       [Sequelize.col('Unidad.codigo'), 'unidad'],
//       [Sequelize.fn('SUM', Sequelize.col('cantidad')), 'total_real']
//     ],
//     include: [
//       { model: models.InventarioItem, attributes: [] },
//       { model: models.Unidad, attributes: [] }
//     ],
//     where: { 
//       tipo: 'SALIDA',
//       ...whereFecha // Ahora se propaga { fecha: ... } correctamente
//     },
//     group: ['InventarioItem.nombre', 'Unidad.codigo'],
//     raw: true
//   });

//   return consumos;
// };

// /**
//  * 5. PAGOS Y MANO DE OBRA
//  * Responde: "¿Cuánto costó la nómina?"
//  */
// exports.getPagosStats = async ({ desde, hasta }) => {
//   /*
//     Necesitamos sumar NominaDetalle filtrando por la fecha de la NominaSemana
//   */
  
//   // 1. Buscamos las semanas en el rango
//   const semanas = await models.NominaSemana.findAll({
//     where: {
//       fecha_inicio: getDateRange(desde, hasta),
//       estado: 'Aprobada' // Solo lo pagado real
//     },
//     attributes: ['id', 'semana_iso']
//   });
  
//   const nominaIds = semanas.map(s => s.id);

//   if (nominaIds.length === 0) return { total_pagado: 0, desglose: [] };

//   // 2. Sumamos detalles
//   const detalles = await models.NominaDetalle.findAll({
//     attributes: [
//       [Sequelize.col('Trabajador.nombres'), 'nombres'],
//       [Sequelize.col('Trabajador.apellidos'), 'apellidos'],
//       [Sequelize.fn('SUM', Sequelize.col('tareas_completadas')), 'total_tareas'],
//       [Sequelize.fn('SUM', Sequelize.col('monto_total')), 'total_dinero']
//     ],
//     include: [{ model: models.Usuario, as: 'Trabajador', attributes: [] }],
//     where: { nomina_id: { [Op.in]: nominaIds } },
//     group: ['Trabajador.id', 'Trabajador.nombres', 'Trabajador.apellidos'],
//     raw: true
//   });

//   const granTotal = detalles.reduce((acc, d) => acc + Number(d.total_dinero), 0);

//   return {
//     rango: { desde, hasta },
//     total_pagado_periodo: granTotal.toFixed(2),
//     desglose_por_trabajador: detalles
//   };
// };