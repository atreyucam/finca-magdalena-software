// backend/src/modules/tareas/tareas.service.js
const { Op } = require("sequelize");
const { models, sequelize } = require("../../db");
const invService = require("../inventario/inventario.service"); // Se actualizará en Sección 3
const notifs = require('../notificaciones/notificaciones.service');
const { formatoFechaHoraCorta } = require("../../utils/fechas");
const { convertir } = require("../../utils/units"); // ✅ Usamos la nueva utilidad

// --- Helpers de Error ---
function badRequest(msg) { const e = new Error(msg || "Solicitud inválida"); e.status = 400; e.code = "BAD_REQUEST"; return e; }
function forbidden(msg) { const e = new Error(msg || "Prohibido"); e.status = 403; e.code = "FORBIDDEN"; return e; }
function notFound(msg) { const e = new Error(msg || "No encontrado"); e.status = 404; e.code = "NOT_FOUND"; return e; }

// --- Utilidad Socket ---
function emitTarea(io, tareaId, type, payload = {}) {
  if (!io) return;
  io.emit("tareas:update");
  io.to(`tarea:${tareaId}`).emit(`tarea:${type}`, { tareaId, ...payload });
}

// Helper para comparar arrays de filas
const diffFilas = (oldArr = [], newArr = []) => {
    // Si es la primera vez
    if (!oldArr.length && newArr.length) return "Registro inicial de filas.";

    const cambios = [];
    // Mapa para búsqueda rápida
    const oldMap = new Map(oldArr.map(f => [f.numero, f.gabetas]));
    
    newArr.forEach(f => {
        const oldVal = oldMap.get(f.numero);
        if (oldVal === undefined) {
            cambios.push(`Fila ${f.numero}: Nueva (${f.gabetas})`);
        } else if (Number(oldVal) !== Number(f.gabetas)) {
            cambios.push(`Fila ${f.numero}: ${oldVal} -> ${f.gabetas}`);
        }
    });

    // Detectar eliminadas
    const newMap = new Map(newArr.map(f => [f.numero, true]));
    oldArr.forEach(f => {
        if (!newMap.has(f.numero)) cambios.push(`Fila ${f.numero}: Eliminada`);
    });

    return cambios.length > 0 ? `Cambios en filas: ${cambios.join(", ")}` : null;
};

const diffLogistica = (oldObj = {}, newObj = {}) => {
    const cambios = [];
    if (oldObj.centro_acopio !== newObj.centro_acopio) 
        cambios.push(`Centro: "${oldObj.centro_acopio || 'N/A'}" -> "${newObj.centro_acopio}"`);
    
    if (Number(oldObj.gabetas_entregadas) !== Number(newObj.gabetas_entregadas)) 
        cambios.push(`Entregadas: ${oldObj.gabetas_entregadas || 0} -> ${newObj.gabetas_entregadas}`);
    
    if (Number(oldObj.gabetas_devueltas) !== Number(newObj.gabetas_devueltas)) 
        cambios.push(`Devueltas: ${oldObj.gabetas_devueltas || 0} -> ${newObj.gabetas_devueltas}`);

    return cambios.length > 0 ? `Logística: ${cambios.join(", ")}` : null;
};

const diffLiquidacion = (oldArr = [], newArr = [], oldTotal, newTotal) => {
    if (!oldArr.length && newArr.length) return `Registro inicial liquidación ($${newTotal}).`;
    if (oldTotal !== newTotal) return `Cambio en liquidación total: $${oldTotal} -> $${newTotal}`;
    return null;
};

// Helper para comparar logística
const diffEntrega = (oldObj = {}, newObj = {}) => {
    let cambios = [];
    if (oldObj.centro_acopio !== newObj.centro_acopio) cambios.push(`Centro: ${oldObj.centro_acopio || 'N/A'} -> ${newObj.centro_acopio}`);
    if (oldObj.gabetas_entregadas !== newObj.gabetas_entregadas) cambios.push(`Entregadas: ${oldObj.gabetas_entregadas || 0} -> ${newObj.gabetas_entregadas}`);
    return cambios.join(", ");
};


async function getPropietariosIds() {
  const owners = await models.Usuario.findAll({
    include: [{ model: models.Role, where: { nombre: 'Propietario' } }],
    where: { estado: 'Activo' },
    attributes: ['id'],
  });
  return owners.map(o => o.id);
}

async function getAsignadosIds(tareaId) {
  const rows = await models.TareaAsignacion.findAll({
    where: { tarea_id: tareaId },
    attributes: ['usuario_id'],
  });
  return rows.map(r => r.usuario_id);
}

function uniqIds(arr = []) {
  return [...new Set(arr.map(String))].map(Number);
}

async function getNombreUsuario(usuarioId) {
  const u = await models.Usuario.findByPk(usuarioId, { attributes: ['nombres','apellidos'] });
  if (!u) return "Usuario";
  return `${u.nombres || ""} ${u.apellidos || ""}`.trim() || "Usuario";
}


exports.actualizarAsignaciones = async (currentUser, tareaId, body, io) => {
  if (!["Propietario", "Tecnico"].includes(currentUser.role)) throw forbidden();

  const { usuarios = [] } = body;
  const tarea = await models.Tarea.findByPk(tareaId);
  if (!tarea) throw notFound();
  if (["Verificada", "Cancelada"].includes(tarea.estado)) throw badRequest("No se puede reasignar en este estado.");

  const nuevos = uniqIds(usuarios);

  const existentesRows = await models.TareaAsignacion.findAll({
    where: { tarea_id: tareaId },
    attributes: ["usuario_id"],
  });
  const existentes = existentesRows.map(r => Number(r.usuario_id));

  const aAgregar = nuevos.filter(id => !existentes.includes(id));
  const aRemover = existentes.filter(id => !nuevos.includes(id));

  await sequelize.transaction(async (t) => {
    if (aRemover.length) {
      await models.TareaAsignacion.destroy({
        where: { tarea_id: tareaId, usuario_id: aRemover },
        transaction: t
      });
    }

    if (aAgregar.length) {
      const bulk = aAgregar.map(uid => ({
        tarea_id: tareaId,
        usuario_id: uid,
        rol_en_tarea: 'Ejecutor',
        asignado_por_id: currentUser.sub
      }));
      await models.TareaAsignacion.bulkCreate(bulk, { transaction: t });
    }

    if (tarea.estado === 'Pendiente' && nuevos.length > 0) {
      tarea.estado = 'Asignada';
      await tarea.save({ transaction: t });
    }
  });

  // ✅ SOCKET refresh
  if (io) emitTarea(io, tareaId, "asignaciones", { tareaId });

  // ✅ NOTIFICAR REMOVIDOS (Regla 3)
  const quien = await getNombreUsuario(currentUser.sub);
  const ref = { tarea_id: tareaId, lote_id: tarea.lote_id, cosecha_id: tarea.cosecha_id };

  for (const uid of aRemover) {
    await notifs.crearYEmitir(io, uid, {
      tipo: "Tarea",
      titulo: "Removido de una tarea",
      mensaje: `Fuiste removido de la tarea "${tarea.titulo}" por ${quien}.`,
      referencia: ref,
      prioridad: "Alerta",
    });
  }

  // (Opcional) también notificar a los nuevos asignados
  for (const uid of aAgregar) {
    await notifs.crearYEmitir(io, uid, {
      tipo: "Tarea",
      titulo: "Nueva tarea asignada",
      mensaje: `Se te asignó la tarea "${tarea.titulo}".`,
      referencia: ref,
      prioridad: "Alerta",
    });
  }

  return await exports.obtenerTarea(currentUser, tareaId);
};


// =====================================================================
// 🧠 MOTOR DE REGLAS DE NEGOCIO (BPA - Buenas Prácticas Agrícolas)
// =====================================================================

const REGLAS_BPA = {
  poda: (d) => {
    if (!d.tipo) throw badRequest("PODA: El 'tipo' (Formación/Sanitaria/Producción) es obligatorio.");
    // Validamos que el porcentaje sea lógico
    if (d.porcentaje_plantas_plan_pct > 100) throw badRequest("PODA: No puedes planificar más del 100% del lote.");
    return {
      tipo: d.tipo,
      herramientas_desinfectadas: d.herramientas_desinfectadas || false,
      disposicion_restos: d.disposicion_restos || 'Compostaje en sitio',
      porcentaje_plantas_plan_pct: Number(d.porcentaje_plantas_plan_pct) || 0,
      porcentaje_plantas_real_pct: 0 // Inicializa en 0
    };
  },
  maleza: (d) => {
    if (!d.metodo) throw badRequest("MALEZA: El 'metodo' es obligatorio.");
    return {
      metodo: d.metodo,
      cobertura_planificada_pct: Number(d.cobertura_planificada_pct || d.cobertura_estimada_pct) || 0,
      cobertura_real_pct: 0,
      altura_corte_cm: d.altura_corte_cm || null
    };
  },
  nutricion: (d) => {
    if (!d.metodo_aplicacion) throw badRequest("NUTRICIÓN: Método de aplicación requerido.");
    return {
      metodo_aplicacion: d.metodo_aplicacion,
      clima_inicio: d.clima_inicio || null,
      epp_verificado: d.epp_verificado || false,
      periodo_reingreso_horas: Number(d.periodo_reingreso_horas) || 4,
      porcentaje_plantas_plan_pct: Number(d.porcentaje_plantas_plan_pct) || 100,
      porcentaje_plantas_real_pct: 0
    };
  },
  fitosanitario: (d) => {
    if (!d.plaga_enfermedad) throw badRequest("FITO: Debes especificar la Plaga o Enfermedad.");
    if (!d.periodo_carencia_dias) throw badRequest("FITO: El Período de Carencia es obligatorio por seguridad alimentaria.");
    return {
      plaga_enfermedad: d.plaga_enfermedad,
      periodo_carencia_dias: Number(d.periodo_carencia_dias),
      periodo_reingreso_horas: Number(d.periodo_reingreso_horas) || 24,
      
      // 🟢 CAMBIO AQUÍ: Usamos lo que mande el front (el nombre del recurso) o un default genérico
      equipo_aplicacion: d.equipo_aplicacion || 'Aplicación Manual', 
      
      epp_verificado: d.epp_verificado || false,
      clima_inicio: d.clima_inicio || null,
      porcentaje_plantas_plan_pct: Number(d.porcentaje_plantas_plan_pct) || 100,
      porcentaje_plantas_real_pct: 0
    };
  },
  enfundado: (d) => {
    return {
      porcentaje_frutos_plan_pct: Number(d.porcentaje_frutos_plan_pct) || 100,
      porcentaje_frutos_real_pct: 0,
      material_funda: d.material_funda || 'Estándar'
    };
  },
  // ---------------------------------------------------------
  // 🟢 MODIFICACIÓN: Actualizar esquema de Cosecha
  // ---------------------------------------------------------
  cosecha: (d) => {
    return {
      kg_planificados: Number(d.kg_planificados) || 0,
      kg_cosechados: Number(d.kg_cosechados) || 0,
      grado_madurez: Number(d.grado_madurez) || 0,
      higiene_verificada: !!d.higiene_verificada,
      
      // Conteo por Filas
      filas_recolectadas: Array.isArray(d.filas_recolectadas) 
        ? d.filas_recolectadas.map(f => ({
            numero: f.numero || 1,
            gabetas: Number(f.gabetas) || 0
          })) 
        : [],

      // ✅ NUEVO: Clasificación Comercial (Antes en Modal)
      clasificacion: Array.isArray(d.clasificacion)
        ? d.clasificacion.map(c => ({
            destino: c.destino || "Nacional",
            gabetas: Number(c.gabetas) || 0,
            peso_promedio_gabeta_kg: Number(c.peso_promedio_gabeta_kg) || 0,
            kg: Number(c.kg) || 0
        })) : [],

      // ✅ NUEVO: Rechazos / Merma (Antes en Modal)
      rechazos: Array.isArray(d.rechazos)
        ? d.rechazos.map(r => ({
            causa: r.causa || "Otro",
            observacion: r.observacion || "",
            kg: Number(r.kg) || 0
        })) : [],

      // Logística de Entrega
      entrega: {
        centro_acopio: d.entrega?.centro_acopio || "",
        gabetas_entregadas: Number(d.entrega?.gabetas_entregadas) || 0,
        gabetas_devueltas: Number(d.entrega?.gabetas_devueltas) || 0,
        gabetas_netas: (Number(d.entrega?.gabetas_entregadas) || 0) - (Number(d.entrega?.gabetas_devueltas) || 0)
      },

      // Liquidación Financiera
      liquidacion: Array.isArray(d.liquidacion)
        ? d.liquidacion.map(l => ({
            calidad: l.calidad || "General",
            gabetas: Number(l.gabetas) || 0,
            novedad: l.novedad || "",
            valor_total: Number(l.valor_total) || 0
          }))
        : [],
        
      total_dinero: Number(d.total_dinero) || 0
    };
  }
};

/**
 * Valida y sanea el JSON de detalles según el tipo de actividad.
 */
function validarDetalles(tipoCodigo, detallesRaw) {
  const sanitizer = REGLAS_BPA[tipoCodigo.toLowerCase()];
  if (!sanitizer) return detallesRaw; // Si no hay regla específica, guarda tal cual (fallback)
  return sanitizer(detallesRaw);
}

// =====================================================================
// 📝 SERVICIOS CRUD
// =====================================================================
/**
 * 1. CREAR TAREA
 * Integra la validación obligatoria: El Lote y la Cosecha deben pertenecer a la misma Finca.
 */
exports.crearTarea = async (currentUser, data, io) => {
  if (!["Propietario", "Tecnico"].includes(currentUser.role)) throw forbidden();

  const {
    titulo, fecha_programada, lote_id, cosecha_id, periodo_id,
    tipo_codigo, tipo_id, descripcion, asignados = [], detalle = {}, items = []
  } = data;

  if (!lote_id || !fecha_programada || !cosecha_id) {
    throw badRequest("Faltan campos obligatorios (Lote, Fecha, Cosecha)");
  }

  // --- 🛡️ VALIDACIÓN DE INTEGRIDAD FINCA-LOTE-COSECHA ---
  const lote = await models.Lote.findByPk(lote_id);
  if (!lote) throw badRequest("El lote seleccionado no existe.");

  const cosecha = await models.Cosecha.findByPk(cosecha_id);
  if (!cosecha) throw badRequest("La cosecha seleccionada no existe.");
  if (cosecha.estado !== "Activa") throw badRequest("La cosecha seleccionada no está activa.");

  if (String(lote.finca_id) !== String(cosecha.finca_id)) {
    throw badRequest(
      `Conflicto de ubicación: El lote pertenece a la finca ID ${lote.finca_id} pero la cosecha seleccionada es de la finca ID ${cosecha.finca_id}. No se pueden cruzar datos entre fincas.`
    );
  }
  // -------------------------------------------------------

  // Resolver Tipo Actividad
  let finalTipoCodigo = tipo_codigo;
  let finalTipoId = tipo_id;

  if (!finalTipoId && finalTipoCodigo) {
    const t = await models.TipoActividad.findOne({ where: { codigo: finalTipoCodigo } });
    if (!t) throw badRequest("Tipo de actividad inválido");
    finalTipoId = t.id;
  } else if (finalTipoId && !finalTipoCodigo) {
    const t = await models.TipoActividad.findByPk(finalTipoId);
    if (!t) throw badRequest("ID Tipo inválido");
    finalTipoCodigo = t.codigo;
  }

  const detallesJSON = validarDetalles(finalTipoCodigo, detalle);

  // 1) Crear dentro de TX
  const result = await sequelize.transaction(async (t) => {
    const tarea = await models.Tarea.create({
      titulo,
      tipo_id: finalTipoId,
      lote_id,
      cosecha_id,
      periodo_id: periodo_id || null,
      fecha_programada: new Date(fecha_programada),
      descripcion,
      creador_id: currentUser.sub,
      estado: "Pendiente",
      detalles: detallesJSON,
    }, { transaction: t });

    if (items.length > 0) {
      await crearItemsTarea(t, tarea.id, items);
    }

    await models.TareaEstado.create({
      tarea_id: tarea.id,
      estado: "Pendiente",
      usuario_id: currentUser.sub,
      comentario: "Tarea creada en el sistema",
      fecha: new Date(),
    }, { transaction: t });

    let asignadosIds = [];
    if (asignados.length > 0) {
      const validUsers = await models.Usuario.findAll({
        where: { id: asignados, estado: "Activo" },
        attributes: ["id"],
        transaction: t
      });

      const bulk = validUsers.map(u => ({
        tarea_id: tarea.id,
        usuario_id: u.id,
        rol_en_tarea: "Ejecutor",
        asignado_por_id: currentUser.sub
      }));

      await models.TareaAsignacion.bulkCreate(bulk, { transaction: t });

      tarea.estado = "Asignada";
      await tarea.save({ transaction: t });

      await models.TareaEstado.create({
        tarea_id: tarea.id,
        estado: "Asignada",
        usuario_id: currentUser.sub,
        comentario: "Personal asignado automáticamente al pool compartido",
        fecha: new Date(),
      }, { transaction: t });

      asignadosIds = validUsers.map(u => u.id);
    }

    // devolvemos datos para notificar fuera
    return {
      tareaId: tarea.id,
      titulo: tarea.titulo,
      fecha_programada: tarea.fecha_programada,
      lote_id: tarea.lote_id,
      cosecha_id: tarea.cosecha_id,
      creador_id: tarea.creador_id,
      asignadosIds
    };
  });

  // 2) Notificar FUERA de TX (seguro)
  const {
    tareaId, asignadosIds, creador_id,
  } = result;

  // (Opcional) si quieres datos “bonitos” en el mensaje
  // - evita includes pesados, solo nombres puntuales
  const loteInfo = await models.Lote.findByPk(result.lote_id, { attributes: ["id", "nombre"] });
  const fechaTxt = new Date(result.fecha_programada).toLocaleDateString("es-EC");

  const ref = { tarea_id: tareaId, lote_id: result.lote_id, cosecha_id: result.cosecha_id };

  const asignadosSet = new Set(asignadosIds.map(String));
  const creadorEstaAsignado = asignadosSet.has(String(creador_id));

  // A) notif al creador
  if (creadorEstaAsignado) {
    await notifs.crearYEmitir(io, creador_id, {
      tipo: "Tareas",
      titulo: "Tarea creada y asignada",
      mensaje: `Se creó y se te asignó la tarea "${result.titulo}" para el ${fechaTxt}${loteInfo?.nombre ? ` (Lote: ${loteInfo.nombre})` : ""}.`,
      referencia: ref,
      prioridad: "Info",
    });
  } else {
    await notifs.crearYEmitir(io, creador_id, {
      tipo: "Tarea",
      titulo: "Tarea creada",
      mensaje: `Creaste la tarea "${result.titulo}" para el ${fechaTxt}${loteInfo?.nombre ? ` (Lote: ${loteInfo.nombre})` : ""}.`,
      referencia: ref,
      prioridad: "Info",
    });
  }

  // B) notif a asignados (excepto creador si ya se notificó arriba como “creada y asignada”)
  const destinatarios = asignadosIds
    .map(String)
    .filter(uid => !(creadorEstaAsignado && uid === String(creador_id)));

  for (const uid of destinatarios) {
    await notifs.crearYEmitir(io, uid, {
      tipo: "Tarea",
      titulo: "Nueva tarea asignada",
      mensaje: `Se te asignó la tarea "${result.titulo}" para el ${fechaTxt}${loteInfo?.nombre ? ` (Lote: ${loteInfo.nombre})` : ""}.`,
      referencia: ref,
      prioridad: "Alerta",
    });
  }

  // (Opcional) sockets si ya estás usando io para refrescar UI en tiempo real
  // io?.to(`user:${creador_id}`)?.emit("notif:nueva");
  // for (const uid of destinatarios) io?.to(`user:${uid}`)?.emit("notif:nueva");

  return result; // { tareaId, asignadosIds, ... }
};


// ... Iniciar Tarea (Similar a antes, solo control de estado)
exports.iniciarTarea = async (currentUser, tareaId, comentario, io) => {
  const tarea = await models.Tarea.findByPk(tareaId);
  if (!tarea) throw notFound();
  if (["Verificada", "Cancelada", "Completada"].includes(tarea.estado)) throw badRequest("Estado no permite iniciar");

  // Validación trabajador
  if (currentUser.role === 'Trabajador') {
    const asign = await models.TareaAsignacion.findOne({ where: { tarea_id: tareaId, usuario_id: currentUser.sub } });
    if (!asign) throw forbidden("No estás asignado a esta tarea.");
  }

  tarea.estado = "En progreso";
  if (!tarea.fecha_inicio_real) tarea.fecha_inicio_real = new Date();
  await tarea.save();

  await models.TareaEstado.create({
    tarea_id: tareaId,
    estado: "En progreso",
    usuario_id: currentUser.sub,
    comentario: comentario || "Iniciado",
    fecha: new Date()
  });

  emitTarea(io, tareaId, "estado", { estado: "En progreso" });
  return await exports.obtenerTarea(currentUser, tareaId);
};

// =====================================================================
// 🏁 COMPLETAR TAREA (Actualización del JSONB)
// =====================================================================
exports.completarTarea = async (currentUser, tareaId, body, io) => {
  const tarea = await models.Tarea.findByPk(tareaId, { include: [models.TipoActividad] });
  if (!tarea) throw notFound();
  
  if (currentUser.role === 'Trabajador') {
    const asign = await models.TareaAsignacion.findOne({ where: { tarea_id: tareaId, usuario_id: currentUser.sub } });
    if (!asign) throw forbidden();
  }

  const { comentario, items: itemsReal = [], detalle: detalleReal = {} } = body;

  await sequelize.transaction(async (t) => {
    // 1. Actualizar Consumo Real de Ítems (Trazabilidad)
    if (itemsReal.length > 0) {
      for (const itemInput of itemsReal) {
        const whereItem = itemInput.id 
          ? { id: itemInput.id, tarea_id: tareaId }
          : { item_id: itemInput.item_id, tarea_id: tareaId };

        const tareaItem = await models.TareaItem.findOne({ where: whereItem, transaction: t });
        
        if (tareaItem) {
          tareaItem.cantidad_real = Number(itemInput.cantidad_real);
          if (itemInput.lote_insumo_manual) tareaItem.lote_insumo_manual = itemInput.lote_insumo_manual;
          await tareaItem.save({ transaction: t });
        }
      }
    }

    // 2. Actualizar Detalles JSONB 
    // 🔥 CORRECCIÓN CLAVE: Hacemos un "Merge" de lo viejo con lo nuevo.
    // Esto asegura que clima, epp, herramientas, porcentajes, etc., se guarden SIEMPRE.
    const detallesActuales = tarea.detalles || {};
    const nuevosDetalles = { ...detallesActuales, ...detalleReal };

    // (Opcional) Asegurar tipos numéricos para consistencia en reportes
    if (nuevosDetalles.porcentaje_plantas_real_pct !== undefined) 
        nuevosDetalles.porcentaje_plantas_real_pct = Number(nuevosDetalles.porcentaje_plantas_real_pct);
    if (nuevosDetalles.cobertura_real_pct !== undefined)
        nuevosDetalles.cobertura_real_pct = Number(nuevosDetalles.cobertura_real_pct);
    if (nuevosDetalles.kg_cosechados !== undefined)
        nuevosDetalles.kg_cosechados = Number(nuevosDetalles.kg_cosechados);

    // Guardar el JSON actualizado
    tarea.detalles = nuevosDetalles;

    // 3. Cerrar Tarea
    const ahora = new Date();
    tarea.fecha_fin_real = ahora;
    if(!tarea.fecha_inicio_real) tarea.fecha_inicio_real = ahora;
    
    // Calcular duración en minutos
    const diffMs = ahora - new Date(tarea.fecha_inicio_real);
    tarea.duracion_real_min = Math.max(0, Math.round(diffMs / 60000));
    
    tarea.estado = "Completada";
    
    await tarea.save({ transaction: t });

    await models.TareaEstado.create({
      tarea_id: tarea.id,
      estado: "Completada",
      usuario_id: currentUser.sub,
      comentario: comentario || "Completado",
      fecha: ahora
    }, { transaction: t });
  });

    // ✅ NOTIFICAR AL CREADOR cuando se completa
  const quien = await getNombreUsuario(currentUser.sub);
  const ref = { tarea_id: tareaId, lote_id: tarea.lote_id, cosecha_id: tarea.cosecha_id };

  await notifs.crearYEmitir(io, tarea.creador_id, {
    tipo: "Tarea",
    titulo: "Tarea completada",
    mensaje: `La tarea "${tarea.titulo}" fue marcada como COMPLETADA por ${quien}.`,
    referencia: ref,
    prioridad: "Info",
  });


  emitTarea(io, tareaId, "estado", { estado: "Completada" });
  return await exports.obtenerTarea(currentUser, tareaId);
};

// =====================================================================
// ✅ VERIFICAR TAREA (Consumo Definitivo de Inventario + Actualización Final)
// =====================================================================
exports.verificarTarea = async (currentUser, tareaId, body, io) => {
  if (!["Propietario", "Tecnico"].includes(currentUser.role)) throw forbidden();
  
  // ✅ 1. Extraemos 'detalle' del body (antes no se hacía)
  const { comentario, force = false, detalle } = body;

  const tarea = await models.Tarea.findByPk(tareaId);
  if (!tarea || tarea.estado !== "Completada") throw badRequest("La tarea debe estar Completada para verificar.");

  // Verificar si ya se descontó inventario
  const yaMovido = await models.InventarioMovimiento.findOne({
    where: { referencia: { [Op.contains]: { tarea_id: tareaId } } }
  });

  await sequelize.transaction(async (t) => {
    // ✅ 2. Actualizar Detalles (Checks finales como Herramientas Desinfectadas)
    // Si el frontend envió correcciones o validaciones finales, las guardamos ahora.
    if (detalle && Object.keys(detalle).length > 0) {
        const detallesActuales = tarea.detalles || {};
        // Mezclamos lo viejo con lo nuevo
        tarea.detalles = { ...detallesActuales, ...detalle };
    }

    // 3. Descontar Inventario Real (Lógica original)
    if (!yaMovido) {
      const items = await models.TareaItem.findAll({
        where: { tarea_id: tareaId, categoria: "Insumo" },
        include: [models.InventarioItem],
        transaction: t
      });

      for (const ti of items) {
        const cantidadAUsar = Number(ti.cantidad_real) > 0 ? Number(ti.cantidad_real) : Number(ti.cantidad_planificada);

        if (cantidadAUsar > 0 && ti.InventarioItem) {
          try {
            await invService._moverStock({
              t,
              item: ti.InventarioItem,
              tipo: "SALIDA",
              cantidad: cantidadAUsar,
              unidad_id: ti.unidad_id,
              motivo: `Consumo Tarea #${tareaId} (${tarea.titulo || 'Sin titulo'})`,
              referencia: { tarea_id: tareaId, lote_id: tarea.lote_id }
            });
          } catch (e) {
            if (e.code === 'LOW_STOCK' && force) {
               // Permitir stock negativo si se fuerza
            } else {
              throw badRequest(`Stock insuficiente para ${ti.InventarioItem.nombre}.`);
            }
          }
        }
      }
    }

    // 4. Cambiar Estado a Verificada
    tarea.estado = "Verificada";
    await tarea.save({ transaction: t });

    await models.TareaEstado.create({
      tarea_id: tarea.id,
      estado: "Verificada",
      usuario_id: currentUser.sub,
      comentario,
      fecha: new Date()
    }, { transaction: t });
  });
    const asignados = await getAsignadosIds(tareaId);
  const destinatarios = uniqIds([tarea.creador_id, ...asignados]);

  const quien = await getNombreUsuario(currentUser.sub);
  const ref = { tarea_id: tareaId, lote_id: tarea.lote_id, cosecha_id: tarea.cosecha_id };

  for (const uid of destinatarios) {
    await notifs.crearYEmitir(io, uid, {
      tipo: "Tarea",
      titulo: "Tarea verificada",
      mensaje: `La tarea "${tarea.titulo}" fue VERIFICADA por ${quien}.`,
      referencia: ref,
      prioridad: "Info",
    });
  }


  emitTarea(io, tareaId, "estado", { estado: "Verificada" });
  return await exports.obtenerTarea(currentUser, tareaId);
};
// =====================================================================
// 🔍 CONSULTAS (Lectura y Mapeo DTO)
// =====================================================================

/**
 * 3. OBTENER TAREA (DETALLE)
 * Muestra la información jerárquica completa: Finca -> Lote -> Cosecha.
 */
exports.obtenerTarea = async (currentUser, id) => {
  const tarea = await models.Tarea.findByPk(id, {
    include: [
      { model: models.TipoActividad },
      { 
        model: models.Lote, 
        attributes: ["id", "nombre", "finca_id"],
        include: [{ 
          model: models.Finca, 
          as: 'finca', 
          attributes: ["id", "nombre", "ubicacion"] 
        }] 
      },
      { model: models.Cosecha, attributes: ["id", "nombre", "codigo"] },
      { model: models.PeriodoCosecha, attributes: ["id", "nombre"] },
      { model: models.Usuario, as: "Creador", attributes: ["id", "nombres", "apellidos"] },
      { 
        model: models.TareaAsignacion, 
        include: [{ model: models.Usuario, attributes: ["id", "nombres", "apellidos", "tipo"] }] 
      },
      { 
        model: models.TareaItem,
        include: [
          { model: models.InventarioItem, attributes: ["id", "nombre", "categoria"] },
          { model: models.Unidad, attributes: ["codigo"] }
        ]
      },
      { 
        model: models.TareaEstado, 
        include: [{ model: models.Usuario, attributes: ["nombres", "apellidos"] }] 
      },
      {
        model: models.Novedad,
        include: [{ model: models.Usuario, attributes: ["nombres", "apellidos"] }]
      }
    ]
  });

  if (!tarea) return null;

  // Verificación de permisos para el rol Trabajador
  if (currentUser.role === 'Trabajador') {
    const isAssigned = tarea.TareaAsignacions.some(a => a.usuario_id === currentUser.sub);
    if (!isAssigned) throw forbidden("No tienes acceso a los detalles de esta tarea.");
  }

  const json = tarea.toJSON();
  const tipoCodigo = json.TipoActividad?.codigo.toLowerCase();

  const response = {
    ...json,
    // Atributos de ubicación simplificados para el Frontend
    finca_nombre: json.Lote?.finca?.nombre, // 🔹 Nombre de la finca origen
    lote_nombre: json.Lote?.nombre,
    cosecha_nombre: json.Cosecha?.nombre,
    creador: json.Creador ? { nombre: `${json.Creador.nombres} ${json.Creador.apellidos}` } : null,
    asignaciones: json.TareaAsignacions.map(a => ({
      id: a.id,
      usuario: { 
        id: a.Usuario.id, 
        nombre: `${a.Usuario.nombres} ${a.Usuario.apellidos}`, 
        tipo: a.Usuario.tipo 
      },
      rol_en_tarea: a.rol_en_tarea
    })),
    items: json.TareaItems.map(i => ({
      id: i.id,
      item_id: i.item_id,
      nombre: i.InventarioItem?.nombre,
      categoria: i.categoria,
      unidad: i.Unidad?.codigo,
      cantidad_planificada: i.cantidad_planificada,
      cantidad_real: i.cantidad_real
    })),
    estados: json.TareaEstados.map(e => ({
      estado: e.estado,
      fecha: e.fecha,
      comentario: e.comentario,
      usuario: e.Usuario ? { nombre: `${e.Usuario.nombres} ${e.Usuario.apellidos}` } : null
    })),
    novedades: json.Novedads
  };

  // Mapeo dinámico del JSONB según tipo de actividad
  if (tipoCodigo) {
    response[tipoCodigo] = {
      id: tarea.id,
      ...tarea.detalles
    };
  }

  return response;
};

// backend/src/modules/tareas/tareas.service.js

/**
 * 2. LISTAR TAREAS
 * Permite filtrar por finca_id y muestra a qué finca pertenece cada tarea.
 */
exports.listarTareas = async (currentUser, query) => {
  const { finca_id, lote_id, estado, desde, hasta, asignadoA, page = 1, pageSize = 20 } = query;
  const where = {};

  if (lote_id) where.lote_id = lote_id;
  
  // ✅ Filtro de Estado exacto
  if (estado) where.estado = estado;
  
  // ✅ Filtro de Fechas
  if (desde && hasta) where.fecha_programada = { [Op.between]: [desde, hasta] };

  // Configuración de inclusión de Lote y Finca
  const includeLote = {
    model: models.Lote,
    attributes: ['id', 'nombre', 'finca_id'],
    include: [{ 
      model: models.Finca, 
      as: 'finca', 
      attributes: ['id', 'nombre'] 
    }]
  };

  // ✅ FILTRO POR FINCA: Clave para Multifinca
  if (finca_id) {
    includeLote.where = { finca_id: finca_id };
  }

  const includeAsignacion = {
    model: models.TareaAsignacion,
    required: false
  };

  if (currentUser.role === 'Trabajador') {
    includeAsignacion.where = { usuario_id: currentUser.sub };
    includeAsignacion.required = true;
  } else if (asignadoA) {
    includeAsignacion.where = { usuario_id: asignadoA };
    includeAsignacion.required = true;
  }

  const { count, rows } = await models.Tarea.findAndCountAll({
    where,
    include: [
      { model: models.TipoActividad, attributes: ['id', 'nombre', 'codigo'] },
      includeLote,
      { model: models.Cosecha, attributes: ['id', 'nombre', 'codigo'] }, // Incluimos código de cosecha
      includeAsignacion
    ],
    order: [['fecha_programada', 'DESC']],
    limit: Number(pageSize),
    offset: (Number(page) - 1) * Number(pageSize),
    distinct: true
  });

  return {
    total: count,
    page: Number(page),
    totalPages: Math.ceil(count / pageSize), // Agregado helper
    data: rows.map(t => {
      const j = t.toJSON();
      return {
        id: j.id,
        titulo: j.titulo,
        finca: j.Lote?.finca?.nombre, // ✅ Dato crucial para la columna Finca
        finca_id: j.Lote?.finca?.id,
        lote: j.Lote?.nombre,
        tipo: j.TipoActividad?.nombre,
        tipo_codigo: j.TipoActividad?.codigo,
        cosecha: j.Cosecha?.nombre,
        fecha_programada: j.fecha_programada,
        estado: j.estado,
        asignados_count: j.TareaAsignacions?.length || 0
      };
    })
  };
};

// backend/src/modules/tareas/tareas.service.js

exports.resumenTareas = async (currentUser, query) => {
    // 1. Traemos todas las tareas (sin límite estricto para contar bien)
    const data = await exports.listarTareas(currentUser, { ...query, page: 1, pageSize: 5000 }); 
    const tareas = data.data;

    // 2. Inicializamos contadores con TODAS las claves plurales que usa el frontend
    const statsEstado = { 
        Pendientes: 0, 
        Asignadas: 0,    // ✅ ¡Esto faltaba! Por eso no sumaba
        En_Progreso: 0,  // Clave especial
        Completadas: 0, 
        Verificadas: 0, 
        Canceladas: 0 
    };
    
    const statsFinca = {};

    tareas.forEach(t => {
        // --- A. Normalizar estado (Singular DB -> Plural Frontend) ---
        let key = t.estado; 
        if (key === 'Pendiente') key = 'Pendientes';
        else if (key === 'Asignada') key = 'Asignadas';
        else if (key === 'En progreso') key = 'En_Progreso';
        else if (key === 'Completada') key = 'Completadas';
        else if (key === 'Verificada') key = 'Verificadas';
        else if (key === 'Cancelada') key = 'Canceladas';

        // Sumar si la clave es válida
        if (statsEstado[key] !== undefined) {
            statsEstado[key]++;
        }

        // --- B. Conteo por Finca (Para los Tabs) ---
        if (t.finca_id) {
            if (!statsFinca[t.finca_id]) {
                statsFinca[t.finca_id] = { nombre: t.finca, total: 0, listas: 0 };
            }
            statsFinca[t.finca_id].total++;
            // Consideramos "listas" como avance real (Completada o Verificada)
            if (['Completada', 'Verificada'].includes(t.estado)) {
                statsFinca[t.finca_id].listas++;
            }
        }
    });

    return { 
        total: data.total, 
        porGrupo: statsEstado, // ✅ Ahora incluye 'Asignadas' con su valor correcto
        porFinca: statsFinca 
    };
};


// ... Cancelar Tarea (Actualizar estado y cancelar reservas implícitas)
exports.cancelarTarea = async (currentUser, id, body, io) => {
  const tarea = await models.Tarea.findByPk(id);
  if (!tarea) throw notFound();
  if (tarea.estado === "Verificada") throw badRequest("No se puede cancelar una tarea ya verificada.");

  await sequelize.transaction(async (t) => {
    tarea.estado = "Cancelada";
    await tarea.save({ transaction: t });

    await models.TareaEstado.create({
      tarea_id: tarea.id,
      estado: "Cancelada",
      usuario_id: currentUser.sub,
      comentario: body.motivo || "Cancelada manualmente",
      fecha: new Date()
    }, { transaction: t });
  });

  if (io) emitTarea(io, id, "estado", { estado: "Cancelada" });

  // ✅ NOTIFICACIONES
  const propietarios = await getPropietariosIds();
  const asignados = await getAsignadosIds(id);

  const destinatarios = uniqIds([
    ...propietarios,
    tarea.creador_id,
    ...asignados
  ]);

  const quien = await getNombreUsuario(currentUser.sub);
  const ref = { tarea_id: id, lote_id: tarea.lote_id, cosecha_id: tarea.cosecha_id };

  for (const uid of destinatarios) {
    await notifs.crearYEmitir(io, uid, {
      tipo: "Tarea",
      titulo: "Tarea cancelada",
      mensaje: `La tarea "${tarea.titulo}" fue cancelada por ${quien}. Motivo: ${body.motivo || "Sin motivo"}.`,
      referencia: ref,
      prioridad: "Alerta",
    });
  }

  return { ok: true, id };
};



exports.asignarUsuarios = async (currentUser, tareaId, body, io) => {
  return await exports.actualizarAsignaciones(currentUser, tareaId, body, io);
};




exports.crearNovedad = async (currentUser, tareaId, body) => {
    const nov = await models.Novedad.create({
        tarea_id: tareaId,
        autor_id: currentUser.sub,
        texto: body.texto
    });
    return nov;
};

exports.listarNovedades = async (currentUser, tareaId) => {
    return models.Novedad.findAll({ where: { tarea_id: tareaId }, include: [models.Usuario] });
};

exports.actualizarDetalles = async (currentUser, tareaId, body, io) => {
  const tarea = await models.Tarea.findByPk(tareaId);
  if (!tarea) throw notFound();

  // 1. Validación de Estado y Permisos
  if (["Verificada", "Cancelada"].includes(tarea.estado)) {
      throw badRequest("No se puede editar una tarea verificada o cancelada.");
  }
  if (currentUser.role === 'Trabajador') {
      const asignado = await models.TareaAsignacion.findOne({ where: { tarea_id: tareaId, usuario_id: currentUser.sub } });
      if (!asignado) throw forbidden("No estás asignado a esta tarea.");
  }

  const detallesAnteriores = tarea.detalles || {};
  let mensajesBitacora = [];

  // 2. Detección de Cambios

  // A. KG BÁSCULA (Habilitador)
  if (body.kg_cosechados !== undefined) {
      const oldKg = detallesAnteriores.kg_cosechados || 0;
      if (Number(oldKg) !== Number(body.kg_cosechados)) {
          mensajesBitacora.push(`Peso en báscula actualizado: ${oldKg}kg -> ${body.kg_cosechados}kg`);
      }
  }

  // B. FILAS
  if (body.filas_recolectadas) {
      const diff = diffFilas(detallesAnteriores.filas_recolectadas, body.filas_recolectadas);
      if (diff) mensajesBitacora.push(diff);
  }

  // C. LOGÍSTICA
  if (body.entrega) {
      // Merge temporal para comparar bien, ya que body puede traer parciales
      const nextEntrega = { ...(detallesAnteriores.entrega || {}), ...body.entrega };
      const diff = diffLogistica(detallesAnteriores.entrega, nextEntrega);
      if (diff) mensajesBitacora.push(diff);
  }

  // D. LIQUIDACIÓN
  if (body.liquidacion) {
      // Recalcular total automáticamente en el backend para seguridad
      const nuevoTotal = body.liquidacion.reduce((acc, i) => acc + (Number(i.valor_total)||0), 0);
      body.total_dinero = nuevoTotal;

      const diff = diffLiquidacion(
          detallesAnteriores.liquidacion, 
          body.liquidacion, 
          detallesAnteriores.total_dinero || 0, 
          nuevoTotal
      );
      if (diff) mensajesBitacora.push(diff);
  }

  await sequelize.transaction(async (t) => {
      // Merge profundo
      const nuevosDetalles = { ...detallesAnteriores, ...body };
      
      if (body.entrega) {
          nuevosDetalles.entrega = { ...(detallesAnteriores.entrega || {}), ...body.entrega };
      }

      tarea.detalles = nuevosDetalles;
      await tarea.save({ transaction: t });

      // Guardar Logs
      if (mensajesBitacora.length > 0) {
          await models.TareaEstado.create({ 
              tarea_id: tarea.id,
              estado: tarea.estado, 
              usuario_id: currentUser.sub,
              comentario: mensajesBitacora.join(". "),
              fecha: new Date()
          }, { transaction: t });
      }
  });

  // Notificar al socket para refrescar UI en tiempo real
  if (io) emitTarea(io, tareaId, "detalles", { tareaId });

  return await exports.obtenerTarea(currentUser, tareaId);
};
// --- Helpers Internos ---

async function crearItemsTarea(t, tareaId, items) {
  const records = [];
  for (const it of items) {
    const itemDB = await models.InventarioItem.findByPk(it.item_id);
    if (!itemDB) continue;
    
    // Buscar unidad si viene código
    let unidadId = it.unidad_id;
    if (!unidadId && it.unidad_codigo) {
        const u = await models.Unidad.findOne({ where: { codigo: it.unidad_codigo } });
        if (u) unidadId = u.id;
    }

    records.push({
      tarea_id: tareaId,
      item_id: itemDB.id,
      categoria: itemDB.categoria, // 'Insumo', 'Herramienta'
      unidad_id: unidadId || itemDB.unidad_id,
      cantidad_planificada: Number(it.cantidad_planificada),
      cantidad_real: 0
    });
  }
  await models.TareaItem.bulkCreate(records, { transaction: t });
}