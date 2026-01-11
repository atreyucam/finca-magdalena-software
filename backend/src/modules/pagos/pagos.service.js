// backend/src/modules/pagos/pagos.service.js
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const { Op, fn, col, QueryTypes } = require("sequelize");
const { models, sequelize } = require("../../db");
const { getRangeFromISO } = require("../../utils/week");
const notif = require("../notificaciones/notificaciones.service");

// =====================
// helpers errores
// =====================
function badRequest(m = "Solicitud inválida") {
  const e = new Error(m);
  e.status = 400;
  e.code = "BAD_REQUEST";
  return e;
}
function notFound(m = "No encontrado") {
  const e = new Error(m);
  e.status = 404;
  e.code = "NOT_FOUND";
  return e;
}

// =====================
// helpers negocio
// =====================
function calcTotal(monto_base, ajustes) {
  let total = Number(monto_base || 0);
  for (const a of ajustes || []) total += Number(a.monto || 0);
  return total.toFixed(2);
}

const DOW_LABEL = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
function dowLabel(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  return DOW_LABEL[d.getDay()];
}

function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Pago programado: martes después del domingo (fin de semana).
 * Si la semana es Lunes->Domingo, martes es fecha_fin + 2.
 */
function getPagoProgramado(fecha_fin) {
  return addDays(fecha_fin, 2);
}



// pagos.service.js (agrega arriba si no tienes)
function setPdfHeaders(res, filename, download = false) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `${download ? "attachment" : "inline"}; filename="${filename}"`
  );
   res.setHeader("Access-Control-Expose-Headers", "Content-Disposition")
  // Evita cachear PDFs sensibles
  res.setHeader("Cache-Control", "no-store");
}

// ✅ valida acceso: trabajador solo puede ver SU recibo
async function assertPermisoRecibo(currentUser, det) {
  const u = await models.Usuario.findByPk(currentUser.sub, {
    include: [{ model: models.Role, attributes: ["nombre"] }],
  });
  const role = u?.Role?.nombre || "";

  if (role === "Trabajador") {
    if (Number(det.trabajador_id) !== Number(currentUser.sub)) {
      throw badRequest("No tienes permiso para acceder a este recibo.");
    }
  }
  // Propietario/Tecnico: permitido (si quieres restringir por finca/cosecha se puede después)
}
// ---------------------
// Conteos / días laborados
// ---------------------
async function contarTareasCompletadasTrabajador(trabajador_id, desde, hasta) {
  const [row] = await sequelize.query(
    `SELECT COUNT(DISTINCT te.tarea_id) AS cnt
       FROM tarea_estados te
       JOIN tareas t ON t.id = te.tarea_id
       JOIN tarea_asignaciones ta ON ta.tarea_id = t.id
      WHERE ta.usuario_id = :uid
        AND te.estado = 'Completada'
        AND te.fecha BETWEEN :desde AND :hasta`,
    {
      type: QueryTypes.SELECT,
      replacements: {
        uid: trabajador_id,
        desde: `${desde} 00:00:00`,
        hasta: `${hasta} 23:59:59`,
      },
    }
  );
  return Number(row?.cnt || 0);
}

async function obtenerDiasLaborados(trabajador_id, desde, hasta) {
  const rows = await sequelize.query(
    `SELECT DISTINCT DATE(te.fecha) AS dia
       FROM tarea_estados te
       JOIN tareas t ON t.id = te.tarea_id
       JOIN tarea_asignaciones ta ON ta.tarea_id = t.id
      WHERE ta.usuario_id = :uid
        AND te.estado = 'Completada'
        AND te.fecha BETWEEN :desde AND :hasta
      ORDER BY dia ASC`,
    {
      type: QueryTypes.SELECT,
      replacements: {
        uid: trabajador_id,
        desde: `${desde} 00:00:00`,
        hasta: `${hasta} 23:59:59`,
      },
    }
  );

  const fechas = rows.map((r) => String(r.dia).slice(0, 10));
  const labels = fechas.map(dowLabel); // ["Lun","Mié",...]
  return { fechas, labels, count: labels.length };
}

async function obtenerCargoTrabajador(usuarioId) {
  const u = await models.Usuario.findByPk(usuarioId, {
    include: [{ model: models.Role, attributes: ["nombre"] }],
    attributes: ["id", "nombres", "apellidos", "cedula", "tipo"],
  });
  if (!u) return null;

  const role = u.Role?.nombre || "Sin rol";
  const tipo = u.tipo || null;

  // Ejemplo de cómo lo mostraría el frontend:
  // "Trabajador" + "Fijo/Esporadico" o "Tecnico"
  const cargo = tipo ? `${role} (${tipo})` : role;

  return {
    id: u.id,
    nombres: u.nombres,
    apellidos: u.apellidos,
    cedula: u.cedula,
    tipo,
    role,
    cargo,
    nombre: `${u.nombres} ${u.apellidos}`.trim(),
  };
}
// Helper para obtener datos completos del aprobador (si existe)
async function obtenerNombreAprobador(userId) {
  if (!userId) return "-";
  const u = await models.Usuario.findByPk(userId);
  return u ? `${u.nombres} ${u.apellidos}` : "-";
}

function hr(doc, y, x1, x2) {
  doc.moveTo(x1, y).lineTo(x2, y).strokeColor("#000").lineWidth(1).stroke();
  doc.strokeColor("#000").lineWidth(1);
}

function money(n) {
  const x = Number(n || 0);
  return x.toLocaleString("en-US", { style: "currency", currency: "USD" });
}


// =====================
// CONSOLIDAR SEMANA
// =====================
exports.consolidarSemana = async (currentUser, body) => {
  const { semana_iso, cosecha_id = null } = body || {};
  if (!semana_iso) throw badRequest("semana_iso es obligatorio (p.ej. 2025-W37)");

  const { start, end } = getRangeFromISO(semana_iso);

  // Crear o usar borrador existente
  const [nomina, created] = await models.NominaSemana.findOrCreate({
    where: { semana_iso },
    defaults: {
      semana_iso,
      fecha_inicio: start,
      fecha_fin: end,
      cosecha_id,
      creado_por_id: currentUser.sub,
    },
  });

  if (!created && nomina.estado !== "Borrador") {
    throw badRequest("La semana ya está aprobada. No se puede re-consolidar");
  }

  // si viene cosecha_id y la nómina ya existe, lo fijamos si estaba null
  if (cosecha_id && !nomina.cosecha_id) {
    nomina.cosecha_id = cosecha_id;
    await nomina.save();
  }

  // obtener trabajadores activos con alguna tarea completada en la semana
  const asignaciones = await models.TareaAsignacion.findAll({
    attributes: [[fn("DISTINCT", col("TareaAsignacion.usuario_id")), "usuario_id"]],
    include: [
      {
        model: models.Tarea,
        attributes: [],
        required: true,
        ...(nomina.cosecha_id
          ? { where: { cosecha_id: nomina.cosecha_id } }
          : {}),
        include: [
          {
            model: models.TareaEstado,
            attributes: [],
            required: true,
            where: {
              estado: "Completada",
              fecha: { [Op.between]: [start, `${end} 23:59:59`] },
            },
          },
        ],
      },
      {
        model: models.Usuario,
        attributes: [],
        required: true,
        where: { estado: "Activo" },
      },
    ],
    raw: true,
  });

  const trabajadoresIds = asignaciones.map((a) => Number(a.usuario_id));

  // upsert detalles
  for (const uid of trabajadoresIds) {
    const tareas = await contarTareasCompletadasTrabajador(uid, start, end);
    const diasInfo = await obtenerDiasLaborados(uid, start, end);

    const [det, detCreated] = await models.NominaDetalle.findOrCreate({
      where: { nomina_id: nomina.id, trabajador_id: uid },
      defaults: {
        nomina_id: nomina.id,
        trabajador_id: uid,
        tareas_completadas: tareas,
        dias_laborados: diasInfo.count,
        dias: diasInfo.labels,
        monto_base: "0.00",
        ajustes: [],
        monto_total: "0.00",
        excluido: false,
        metodo_pago: "Efectivo",
        metodo_pago_otro: null,
        comprobante: null,
      },
    });

    if (!detCreated) {
      // refrescar métricas semana
      det.tareas_completadas = tareas;
      det.dias_laborados = diasInfo.count;
      det.dias = diasInfo.labels;

      // recalcular total
      det.monto_total = calcTotal(det.monto_base, det.ajustes);
      await det.save();
    }
  }

  // ---> NUEVO: Notificar a los propietarios que se creó un borrador
  if (created || nomina.estado === 'Borrador') {
     // Buscar usuarios con rol Propietario
     const propietarios = await models.Usuario.findAll({
       include: [{ model: models.Role, where: { nombre: 'Propietario' } }]
     });
     
     for (const prop of propietarios) {
       // Evitar notificar al mismo que lo creó si fue él
       if (Number(prop.id) !== Number(currentUser.sub)) {
         await notif.crear(prop.id, {
           tipo: "Pago",
           titulo: "Nuevo borrador de nómina",
           mensaje: `El pago semana ${semana_iso} ha sido creado en modo borrador.`,
           referencia: { nomina_id: nomina.id },
           prioridad: "Info",
         });
       }
     }
  }

  return await exports.obtenerSemana({ semana_iso });
};

// backend/src/modules/pagos/pagos.service.js

// ... (Imports y helpers anteriores se mantienen igual)

// =====================
// OBTENER SEMANA (TAB 1) - MODIFICADO
// =====================
exports.obtenerSemana = async ({ semana_iso, nomina_id, incluir_excluidos = "true" }) => {
  let nomina;
  
  // Incluimos al Aprobador
  const includeOpts = [
      { model: models.Usuario, as: 'Aprobador', attributes: ['nombres', 'apellidos'] }
  ];

  if (nomina_id) nomina = await models.NominaSemana.findByPk(nomina_id, { include: includeOpts });
  else if (semana_iso) nomina = await models.NominaSemana.findOne({ where: { semana_iso }, include: includeOpts });

  if (!nomina) throw notFound("Semana no encontrada");

  // ... (Logica de detalles se mantiene igual) ...
  const mostrarExcluidos = String(incluir_excluidos) !== "false";
  const detalles = await models.NominaDetalle.findAll({
    where: { nomina_id: nomina.id, ...(mostrarExcluidos ? {} : { excluido: false }) },
    include: [{ model: models.Usuario, as: "Trabajador", attributes: ["id", "nombres", "apellidos", "cedula", "tipo"], include: [{ model: models.Role, attributes: ["nombre"] }] }],
    order: [["trabajador_id", "ASC"]],
  });

  const pagoProgramado = getPagoProgramado(nomina.fecha_fin);
  const incluidos = detalles.filter((d) => !d.excluido);
  const totalPagar = incluidos.reduce((acc, d) => acc + Number(d.monto_total || 0), 0);
  const totalTareas = incluidos.reduce((acc, d) => acc + Number(d.tareas_completadas || 0), 0);

  // Lógica de nombre para Tab 1
  let aprobadoPor = "Pendiente";
  if (nomina.estado === "Aprobada") {
      aprobadoPor = nomina.Aprobador 
        ? `${nomina.Aprobador.nombres} ${nomina.Aprobador.apellidos}` 
        : "Propietario";
  }

  return {
    id: nomina.id,
    semana_iso: nomina.semana_iso,
    fecha_inicio: nomina.fecha_inicio,
    fecha_fin: nomina.fecha_fin,
    pago_programado: pagoProgramado,
    cosecha_id: nomina.cosecha_id,
    estado: nomina.estado,
    aprobado_por_nombre: aprobadoPor, // <--- NUEVO CAMPO

    totales: {
      trabajadores_incluidos: incluidos.length,
      tareas_completadas: totalTareas,
      total_nomina: Number(totalPagar.toFixed(2)),
      excluidos: detalles.filter((d) => d.excluido).length,
    },
    // ... (mapeo detalles igual)
    detalles: detalles.map((d) => {
        const role = d.Trabajador?.Role?.nombre || "Sin rol";
        const tipo = d.Trabajador?.tipo || null;
        const cargo = tipo ? `${role} (${tipo})` : role;
        const nombre = d.Trabajador ? `${d.Trabajador.nombres} ${d.Trabajador.apellidos}`.trim() : String(d.trabajador_id);

        return {
            id: d.id,
            trabajador_id: d.trabajador_id,
            trabajador: { id: d.Trabajador?.id, nombre, cedula: d.Trabajador?.cedula || null },
            cargo,
            dias_laborados: d.dias_laborados || 0,
            dias: Array.isArray(d.dias) ? d.dias : [],
            tareas_completadas: d.tareas_completadas || 0,
            monto_base: d.monto_base,
            ajustes: d.ajustes,
            monto_total: d.monto_total,
            metodo_pago: d.metodo_pago,
            metodo_pago_otro: d.metodo_pago_otro,
            comprobante: d.comprobante,
            excluido: !!d.excluido,
            observaciones: d.observaciones,
            recibo_pdf_path: d.recibo_pdf_path,
        };
    }),
  };
};

// ... (Resto de funciones intermedias igual) ...

// =====================
// TAB 2: HISTORIAL PAGOS - MODIFICADO
// =====================
exports.historialPagos = async (query) => {
  const { desde, hasta, cosecha_id, estado, semana_iso } = query || {};

  const where = {};
  if (semana_iso) where.semana_iso = { [Op.iLike]: `%${semana_iso}%` };
  if (estado) where.estado = estado;
  if (cosecha_id) where.cosecha_id = Number(cosecha_id);
  if (desde || hasta) {
    where.fecha_inicio = { ...(desde ? { [Op.gte]: desde } : {}), ...(hasta ? { [Op.lte]: hasta } : {}) };
  }

  const nominas = await models.NominaSemana.findAll({
    where,
    order: [["fecha_inicio", "DESC"]],
    include: [{ model: models.Usuario, as: 'Aprobador', attributes: ['nombres', 'apellidos'] }]
  });

  const out = [];
  for (const n of nominas) {
    const dets = await models.NominaDetalle.findAll({
      where: { nomina_id: n.id, excluido: false },
      attributes: ["monto_total", "tareas_completadas"],
    });

    const totalNomina = dets.reduce((acc, d) => acc + Number(d.monto_total || 0), 0);
    const totalTareas = dets.reduce((acc, d) => acc + Number(d.tareas_completadas || 0), 0);

    // Lógica Aprobador Tab 2
    let nombreAprobador = "Pendiente";
    if (n.estado === "Aprobada") {
        nombreAprobador = n.Aprobador 
            ? `${n.Aprobador.nombres} ${n.Aprobador.apellidos}`
            : "Propietario";
    }

    out.push({
      id: n.id,
      semana_iso: n.semana_iso,
      fecha_inicio: n.fecha_inicio,
      fecha_fin: n.fecha_fin,
      etiqueta: `${n.semana_iso} — ${n.fecha_inicio} al ${n.fecha_fin}`,
      trabajadores: dets.length,
      tareas: totalTareas,
      total_nomina: Number(totalNomina.toFixed(2)),
      estado: n.estado,
      cosecha_id: n.cosecha_id,
      aprobado_por_nombre: nombreAprobador,
      pago_programado: getPagoProgramado(n.fecha_fin),
      aprobado_at: n.aprobado_at || n.aprobadoAt || null,
      updated_at: n.updated_at || n.updatedAt,
    });
  }

  return out;
};

// ... (Resto del archivo igual)
// =====================
// TOGGLE EXCLUIR / INCLUIR
// =====================
exports.toggleExcluirDetalle = async (nominaId, detalleId, body) => {
  const nomina = await models.NominaSemana.findByPk(nominaId);
  if (!nomina) throw notFound("Semana no encontrada");
  if (nomina.estado !== "Borrador") throw badRequest("Semana aprobada, no editable");

  const det = await models.NominaDetalle.findByPk(detalleId);
  if (!det || det.nomina_id !== nomina.id) throw notFound("Detalle no encontrado");

  // body: { excluido: true/false } opcional
  const nuevo = typeof body?.excluido === "boolean" ? body.excluido : !det.excluido;

  det.excluido = nuevo;
  await det.save();

  return { id: det.id, excluido: det.excluido };
};

// =====================
// EDITAR DETALLE (TAB 1)
// =====================
exports.editarDetalle = async (nominaId, detalleId, body) => {
  const nomina = await models.NominaSemana.findByPk(nominaId);
  if (!nomina) throw notFound("Semana no encontrada");
  if (nomina.estado !== "Borrador") throw badRequest("Semana aprobada, no editable");

  const det = await models.NominaDetalle.findByPk(detalleId);
  if (!det || det.nomina_id !== nomina.id) throw notFound("Detalle no encontrado");

  const fields = [
    "monto_base",
    "ajustes",
    "observaciones",
    "metodo_pago",
    "metodo_pago_otro",
    "comprobante",
  ];

  for (const f of fields) {
    if (f in (body || {})) det[f] = body[f];
  }

  // Normalizaciones:
 if (det.metodo_pago === "Otro") {
  const x = String(det.metodo_pago_otro || "").trim();
  if (!x) throw badRequest("Especifique el método de pago (Otro).");
  det.metodo_pago_otro = x;
} else {
  det.metodo_pago_otro = null;
}



  // recalcular total
  det.monto_total = calcTotal(det.monto_base, det.ajustes);
  await det.save();

  return det.toJSON();
};

// =====================
// BULK UPDATE (Guardar borrador)
// body: { items: [{ id, monto_base, ajustes, metodo_pago, metodo_pago_otro, comprobante, observaciones, excluido }] }
// =====================
exports.bulkUpdateDetalles = async (nominaId, body) => {
  const nomina = await models.NominaSemana.findByPk(nominaId);
  if (!nomina) throw notFound("Semana no encontrada");
  if (nomina.estado !== "Borrador") throw badRequest("Semana aprobada, no editable");

  const items = Array.isArray(body?.items) ? body.items : [];
  if (items.length === 0) return { ok: true, updated: 0 };

  let updated = 0;

  for (const it of items) {
    if (!it?.id) continue;

    const det = await models.NominaDetalle.findByPk(it.id);
    if (!det || det.nomina_id !== nomina.id) continue;

    if ("excluido" in it) det.excluido = !!it.excluido;
    if ("monto_base" in it) det.monto_base = it.monto_base;
    if ("ajustes" in it) det.ajustes = it.ajustes;
    if ("observaciones" in it) det.observaciones = it.observaciones;

    if ("metodo_pago" in it) det.metodo_pago = it.metodo_pago;
    if ("metodo_pago_otro" in it) det.metodo_pago_otro = it.metodo_pago_otro;
    if ("comprobante" in it) det.comprobante = it.comprobante;

    if (det.metodo_pago === "Otro") {
  const x = String(det.metodo_pago_otro || "").trim();
  if (!x) throw badRequest(`Especifique el método de pago (Otro) (detalleId=${det.id}).`);
  det.metodo_pago_otro = x;
} else {
  det.metodo_pago_otro = null;
}


    det.monto_total = calcTotal(det.monto_base, det.ajustes);
    await det.save();
    updated++;
  }

  return { ok: true, updated };
};

// =====================
// APROBAR SEMANA
// =====================
// =====================
// APROBAR SEMANA (Modificado: Generación de Comprobantes Automáticos)
// =====================
exports.aprobarSemana = async (currentUser, nominaId) => {
  const nomina = await models.NominaSemana.findByPk(nominaId);
  if (!nomina) throw notFound("Semana no encontrada");
  if (nomina.estado !== "Borrador") throw badRequest("Ya aprobada");

  // Verificar rol (esto también se protege en ruta, pero doble check)
  const user = await models.Usuario.findByPk(currentUser.sub, { include: [models.Role] });
  if (user?.Role?.nombre !== "Propietario") {
      throw new Error("Solo el Propietario puede aprobar la nómina.");
  }

  const dets = await models.NominaDetalle.findAll({ 
      where: { nomina_id: nomina.id },
      order: [['id', 'ASC']] 
  });

// Generar códigos de comprobante automáticos: FM-[ISO]-[Index]
let contador = 1;
for (const d of dets) {
  if (d.excluido) continue;

  const codigo = `FM-${nomina.semana_iso}-${String(contador).padStart(5, "0")}`;

  // ✅ NO PISAR comprobante si ya existe (ej: número de transferencia/cheque)
  if (!d.comprobante || String(d.comprobante).trim().length === 0) {
    d.comprobante = codigo;
    await d.save();
  }

  contador++;
}


  nomina.estado = "Aprobada";
  nomina.aprobado_por_id = currentUser.sub;
  nomina.aprobado_at = new Date();
  await nomina.save();

  // Notificar a trabajadores (MANTENER LOGICA ORIGINAL)
  for (const d of dets) {
    if (d.excluido) continue;
    await notif.crear(d.trabajador_id, {
      tipo: "Pago",
      titulo: `Pago semanal aprobado (${nomina.semana_iso})`,
      mensaje: `Monto: $${Number(d.monto_total).toFixed(2)}. Comprobante: ${d.comprobante}`,
      referencia: { nomina_id: nomina.id, detalle_id: d.id },
      prioridad: "Info",
    });
  }

  return { id: nomina.id, estado: nomina.estado, aprobado_at: nomina.aprobado_at };
};

// =====================
// TAREAS AGRUPADAS POR DÍA (para modal)
// =====================
exports.obtenerTareasDetalle = async (nominaId, detalleId) => {
  const nomina = await models.NominaSemana.findByPk(nominaId);
  if (!nomina) throw notFound("Semana no encontrada");

  const det = await models.NominaDetalle.findByPk(detalleId);
  if (!det || det.nomina_id !== nomina.id) throw notFound("Detalle no encontrado");

  const trabajador = await obtenerCargoTrabajador(det.trabajador_id);

  const rows = await sequelize.query(
    `SELECT 
        DATE(te.fecha) AS dia,
        t.id AS tarea_id,
        t.fecha_programada::date AS fecha_programada,
        ta2.codigo AS tipo_codigo,
        ta2.nombre AS tipo_nombre,
        l.nombre AS lote_nombre,
        te.estado AS estado
     FROM tarea_estados te
     JOIN tareas t ON t.id = te.tarea_id
     JOIN tarea_asignaciones tas ON tas.tarea_id = t.id
     LEFT JOIN tipos_actividad ta2 ON ta2.id = t.tipo_id
     LEFT JOIN lotes l ON l.id = t.lote_id
    WHERE tas.usuario_id = :uid
      AND te.estado = 'Completada'
      AND te.fecha BETWEEN :desde AND :hasta
      ${nomina.cosecha_id ? "AND t.cosecha_id = :cosecha_id" : ""}
    ORDER BY dia ASC, t.id ASC`,
    {
      type: QueryTypes.SELECT,
      replacements: {
        uid: det.trabajador_id,
        desde: `${nomina.fecha_inicio} 00:00:00`,
        hasta: `${nomina.fecha_fin} 23:59:59`,
        ...(nomina.cosecha_id ? { cosecha_id: nomina.cosecha_id } : {}),
      },
    }
  );

  const grouped = {};
  for (const r of rows) {
    const dia = String(r.dia).slice(0, 10);
    if (!grouped[dia]) grouped[dia] = [];

    grouped[dia].push({
      tarea_id: r.tarea_id,
      fecha: String(r.fecha_programada || dia),
      tipo: r.tipo_codigo || r.tipo_nombre || "-",
      lote: r.lote_nombre || "-",
      estado: r.estado,
    });
  }

  // Resumen (para el modal)
  return {
    nomina: {
      id: nomina.id,
      semana_iso: nomina.semana_iso,
      fecha_inicio: nomina.fecha_inicio,
      fecha_fin: nomina.fecha_fin,
      pago_programado: getPagoProgramado(nomina.fecha_fin),
      estado: nomina.estado,
    },
    detalle: {
      id: det.id,
      trabajador,
      dias_laborados: det.dias_laborados,
      dias: det.dias,
      tareas_completadas: det.tareas_completadas,
      monto_base: det.monto_base,
      ajustes: det.ajustes,
      monto_total: det.monto_total,
      metodo_pago: det.metodo_pago,
      metodo_pago_otro: det.metodo_pago_otro,
      comprobante: det.comprobante,
      excluido: det.excluido,
    },
    tareas_por_dia: Object.keys(grouped).map((dia) => ({
      dia,
      etiqueta: `${dowLabel(dia)} ${dia}`,
      tareas: grouped[dia],
    })),
  };
};

// =====================
// PDF (si lo mantienes)
// =====================
// =====================
// PDF RECIBO INDIVIDUAL (Rediseñado)
// =====================
exports.generarRecibo = async (nominaId, detalleId) => {
  const nomina = await models.NominaSemana.findByPk(nominaId);
  if (!nomina) throw notFound("Semana no encontrada");
  if (nomina.estado !== "Aprobada") throw badRequest("Primero apruebe la semana");

  const det = await models.NominaDetalle.findByPk(detalleId, {
    include: [
      { model: models.Usuario, as: "Trabajador", attributes: ["nombres", "apellidos", "cedula"] },
    ],
  });
  if (!det || det.nomina_id !== nomina.id) throw notFound("Detalle no encontrado");

  // Obtener nombre del aprobador
  const aprobadorNombre = await obtenerNombreAprobador(nomina.aprobado_por_id);

  const storageDir = path.join(__dirname, "../../../storage/recibos");
  if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });

  const filename = `recibo_${nomina.semana_iso}_${det.trabajador_id}_${Date.now()}.pdf`;
  const filepath = path.join(storageDir, filename);
  
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  doc.pipe(fs.createWriteStream(filepath));

  // --- LOGO (Izquierda Superior) ---
  // Asumiendo que el logo está en backend/assets/Logo-FM.png
  const logoPath = path.join(__dirname, "../../assets/Logo-FM.png"); 
  if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 40, 40, { width: 60 });
  }

  // --- CABECERA (Derecha alineada con el logo) ---
  doc.font("Helvetica-Bold").fontSize(14).text("Recibo de Pago - Finca La Magdalena", 120, 45);
  doc.font("Helvetica").fontSize(10).text(`Semana: ${nomina.semana_iso}`, 120, 65);
  doc.text(`Periodo: ${nomina.fecha_inicio} al ${nomina.fecha_fin}`, 120, 80);
  doc.text(`Comprobante: ${det.comprobante || "Pendiente"}`, 120, 95);

  doc.moveDown(4);

  // --- INFO TRABAJADOR ---
  const startY = doc.y;
  doc.font("Helvetica-Bold").fontSize(11).text("Información del Trabajador:");
  doc.font("Helvetica").fontSize(10);
  doc.text(`Nombre: ${det.Trabajador?.nombres} ${det.Trabajador?.apellidos}`);
  doc.text(`Cédula: ${det.Trabajador?.cedula || "-"}`);
  doc.text(`Método de Pago: ${det.metodo_pago} ${det.metodo_pago === 'Otro' ? `(${det.metodo_pago_otro})` : ''}`);
  
  doc.moveDown();

  // --- TABLA DETALLE ---
  const tableTop = doc.y;
  const itemX = 40;
  const descX = 80;
  const totalX = 450;

  // Header Tabla
  doc.font("Helvetica-Bold");
  doc.text("Item", itemX, tableTop);
  doc.text("Detalle", descX, tableTop);
  doc.text("Total", totalX, tableTop, { width: 100, align: 'right' });
  
  doc.moveTo(40, tableTop + 15).lineTo(550, tableTop + 15).stroke();

  let y = tableTop + 25;
  doc.font("Helvetica");

  // Fila 1: Días trabajados
  doc.text("1", itemX, y);
  const diasStr = Array.isArray(det.dias) ? det.dias.join(", ") : "";
  doc.text(`Días laborados: ${det.dias_laborados} (${diasStr})`, descX, y);
  doc.text(`$${Number(det.monto_base).toFixed(2)}`, totalX, y, { width: 100, align: 'right' });
  y += 20;

  // Filas: Ajustes
  if (det.ajustes && Array.isArray(det.ajustes)) {
      det.ajustes.forEach((aj, idx) => {
          doc.text(`${idx + 2}`, itemX, y);
          doc.text(`Ajuste: ${aj.motivo || "Sin motivo"}`, descX, y);
          const signo = Number(aj.monto) > 0 ? "+" : "";
          doc.text(`${signo}$${Number(aj.monto).toFixed(2)}`, totalX, y, { width: 100, align: 'right' });
          y += 20;
      });
  }

  doc.moveTo(40, y).lineTo(550, y).stroke();
  y += 10;

  // --- TOTAL ---
  doc.font("Helvetica-Bold").fontSize(12);
  doc.text("TOTAL A PAGAR:", descX, y);
  doc.text(`$${Number(det.monto_total).toFixed(2)}`, totalX, y, { width: 100, align: 'right' });

  // --- FIRMAS ---
  doc.moveDown(5);
  const firmaY = doc.y;
  
  doc.fontSize(10).font("Helvetica");
  doc.text("__________________________", 60, firmaY);
  doc.text("Firma del Trabajador", 60, firmaY + 15);

  doc.text("__________________________", 350, firmaY);
  doc.text(`Aprobado por: ${aprobadorNombre}`, 350, firmaY + 15);
  doc.text("Propietario", 350, firmaY + 30);

  doc.end();

  det.recibo_pdf_path = `/files/recibos/${filename}`;
  await det.save();
  return { recibo: det.recibo_pdf_path };
};

// =====================
// REPORTE GLOBAL PDF (Rediseñado)
// =====================
exports.reporteSemanaPDF = async (nominaId) => {
  const nomina = await models.NominaSemana.findByPk(nominaId);
  if (!nomina) throw notFound("Semana no encontrada");

  // Obtener aprobador
  const aprobadorNombre = await obtenerNombreAprobador(nomina.aprobado_por_id);

  const detalles = await models.NominaDetalle.findAll({
    where: { nomina_id: nomina.id, excluido: false },
    include: [
      {
        model: models.Usuario,
        as: "Trabajador",
        attributes: ["nombres", "apellidos", "cedula", "tipo"],
        include: [{ model: models.Role, attributes: ["nombre"] }],
      },
    ],
    order: [["trabajador_id", "ASC"]],
  });

  const storageDir = path.join(__dirname, "../../storage/reportes");
  if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });
  const filename = `reporte_nomina_${nomina.semana_iso}_${Date.now()}.pdf`;
  const filepath = path.join(storageDir, filename);

  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  doc.pipe(fs.createWriteStream(filepath));

  // --- LOGO & CABECERA ---
  const logoPath = path.join(__dirname, "../../assets/Logo-FM.png"); 
  if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 40, 40, { width: 50 });
  }

  doc.font("Helvetica-Bold").fontSize(16).text("Reporte de Pago - Finca La Magdalena", 110, 45);
  doc.fontSize(10).font("Helvetica");
  doc.text(`Semana: ${nomina.semana_iso}`, 110, 65);
  doc.text(`Periodo: ${nomina.fecha_inicio} al ${nomina.fecha_fin}`, 110, 80);
  doc.text(`Estado: ${nomina.estado}`, 110, 95);
  doc.text(`Aprobado por: ${aprobadorNombre}`, 110, 110);
  
  doc.moveDown(3);

  // --- RESUMEN ---
  let totalNomina = 0;
  let totalTareas = 0;
  detalles.forEach(d => {
      totalNomina += Number(d.monto_total);
      totalTareas += Number(d.tareas_completadas);
  });

  doc.font("Helvetica-Bold").text("Resumen General:");
  doc.font("Helvetica").text(`Trabajadores incluidos: ${detalles.length}`);
  doc.text(`Tareas completadas: ${totalTareas}`);
  doc.text(`Total Nómina: $${totalNomina.toFixed(2)}`);

  doc.moveDown(2);

  // --- TABLA DETALLADA ---
  const colNombre = 40;
  const colCargo = 200;
  const colDias = 300;
  const colTotal = 450;
  const headerY = doc.y;

  doc.font("Helvetica-Bold").fontSize(9);
  doc.text("Trabajador", colNombre, headerY);
  doc.text("Cargo", colCargo, headerY);
  doc.text("Días / Tareas", colDias, headerY);
  doc.text("Total", colTotal, headerY, { align: 'right', width: 100 });
  
  doc.moveTo(40, headerY + 12).lineTo(550, headerY + 12).stroke();
  doc.moveDown(1.5);

  doc.font("Helvetica").fontSize(9);
  
  for (const d of detalles) {
    // Control de salto de página
    if (doc.y > 700) {
        doc.addPage();
        doc.font("Helvetica-Bold");
        doc.text("Trabajador", colNombre, 40);
        // ... repetición de header si se desea
        doc.font("Helvetica");
        doc.moveDown();
    }

    const nombre = `${d.Trabajador?.nombres || ""} ${d.Trabajador?.apellidos || ""}`;
    const role = d.Trabajador?.Role?.nombre || "";
    const tipo = d.Trabajador?.tipo || "";
    const cargoDisplay = tipo ? `${role} (${tipo})` : role;
    
    doc.text(nombre, colNombre, doc.y, { width: 150 });
    doc.text(cargoDisplay, colCargo, doc.y - 9); // Ajuste ligero por width anterior
    doc.text(`${d.dias_laborados}d / ${d.tareas_completadas}t`, colDias, doc.y - 9);
    doc.text(`$${Number(d.monto_total).toFixed(2)}`, colTotal, doc.y - 9, { align: 'right', width: 100 });
    
    doc.moveDown(0.5);
    doc.moveTo(40, doc.y).lineTo(550, doc.y).strokeColor("#eeeeee").stroke();
    doc.strokeColor("black"); // Reset color
    doc.moveDown(0.5);
  }

  doc.moveDown();
  doc.font("Helvetica-Bold").fontSize(11);
  doc.text(`TOTAL DE LA NÓMINA: $${totalNomina.toFixed(2)}`, 300, doc.y, { align: 'right', width: 250 });

  doc.end();

  // Guardar url
  const url = `/files/reportes/${filename}`;
  return { url };
};



















exports.misRecibos = async (currentUser) => {
  if (currentUser.role !== "Trabajador") return [];

  const dets = await models.NominaDetalle.findAll({
    where: { trabajador_id: currentUser.sub },
    include: [{ model: models.NominaSemana }],
    order: [[{ model: models.NominaSemana }, "fecha_inicio", "DESC"]],
  });

  return dets.map((d) => ({
    semana_iso: d.NominaSemana?.semana_iso,
    fecha_inicio: d.NominaSemana?.fecha_inicio,
    fecha_fin: d.NominaSemana?.fecha_fin,
    monto_total: d.monto_total,
    metodo_pago: d.metodo_pago,
    metodo_pago_otro: d.metodo_pago_otro,
    comprobante: d.comprobante,
    recibo_pdf_path: d.recibo_pdf_path,
  }));
};

// =====================
// BORRADORES
// =====================
exports.listarSemanasBorrador = async () => {
  const nominas = await models.NominaSemana.findAll({
    where: { estado: "Borrador" },
    order: [["fecha_inicio", "DESC"]],
  });

  return nominas.map((n) => ({
    id: n.id,
    semana_iso: n.semana_iso,
    fecha_inicio: n.fecha_inicio,
    fecha_fin: n.fecha_fin,
    pago_programado: getPagoProgramado(n.fecha_fin),
    cosecha_id: n.cosecha_id,
    created_at: n.created_at || n.createdAt,
    updated_at: n.updated_at || n.updatedAt,
  }));
};

exports.eliminarSemana = async (currentUser, nominaId) => {
  const nomina = await models.NominaSemana.findByPk(nominaId);
  if (!nomina) throw notFound("Semana no encontrada");

  if (nomina.estado !== "Borrador") {
    throw badRequest("Solo se pueden eliminar semanas en estado Borrador");
  }

  await models.NominaDetalle.destroy({ where: { nomina_id: nomina.id } });
  await nomina.destroy();

  return { ok: true, deleted_id: nominaId };
};


// =====================
// DESCARGAR / VER RECIBO (SEGURO)
// GET /pagos/recibos/:detalleId?download=true
// =====================
// DESCARGAR RECIBO (STREAM) - NO GUARDA EN BACKEND

// ✅ DESCARGAR / VER RECIBO (STREAM, NO GUARDA EN BACKEND)
exports.descargarRecibo = async (currentUser, detalleId, { download = false, res }) => {
  const { Op } = require("sequelize");
  const PDFDocument = require("pdfkit");
  const path = require("path");
  const fs = require("fs");

  // =========================
  // 1) Cargar detalle + semana + trabajador
  // =========================
  const det = await models.NominaDetalle.findByPk(detalleId, {
    attributes: [
      "id",
      "nomina_id",
      "trabajador_id",
      "tareas_completadas",
      "dias_laborados",
      "dias",
      "monto_base",
      "ajustes",
      "monto_total",
      "metodo_pago",
      "metodo_pago_otro",
      "comprobante",
    ],
    include: [
      {
        model: models.NominaSemana,
        attributes: ["id", "semana_iso", "fecha_inicio", "fecha_fin", "estado"],
        include: [{ model: models.Usuario, as: "Aprobador", attributes: ["nombres", "apellidos"] }],
      },
      {
        model: models.Usuario,
        as: "Trabajador",
        attributes: ["nombres", "apellidos", "cedula", "tipo"],
        include: [{ model: models.Role, attributes: ["nombre"] }],
      },
    ],
  });

  if (!det) throw notFound("Detalle no encontrado");
  await assertPermisoRecibo(currentUser, det);

  const nomina = det.NominaSemana;
  const t = det.Trabajador;

  if (!nomina) throw notFound("Semana no encontrada");
  if (!t) throw notFound("Trabajador no encontrado");

  // =========================
  // 2) Derivados / texto
  // =========================
  const ajustesArr = Array.isArray(det.ajustes) ? det.ajustes : [];
  const ajustesMonto = ajustesArr.reduce((sum, a) => sum + Number(a?.monto || 0), 0);

  const aprobadorNombre = nomina.Aprobador
    ? `${nomina.Aprobador.nombres} ${nomina.Aprobador.apellidos}`
    : "Pendiente";

  const role = t.Role?.nombre || "Sin rol";
  const tipo = t.tipo ? ` (${t.tipo})` : "";
  const cargo = `${role}${tipo}`;
  const nombre = `${t.nombres || ""} ${t.apellidos || ""}`.trim() || "-";

  const metodoPagoTxt =
    det.metodo_pago === "Otro"
      ? `Otro: ${String(det.metodo_pago_otro || "").trim() || "-"}`
      : det.metodo_pago || "-";

  const diasTexto = Array.isArray(det.dias) && det.dias.length ? det.dias.join(", ") : "-";

  // =========================
  // 3) Consultar tareas realizadas (por ejecutor en rango semana)
  // =========================
  const start = new Date(`${nomina.fecha_inicio}T00:00:00.000Z`);
  const end = new Date(`${nomina.fecha_fin}T23:59:59.999Z`);

  const tareas = await models.Tarea.findAll({
    attributes: ["id", "titulo", "fecha_programada", "fecha_fin_real", "estado"],
    where: {
      estado: { [Op.in]: ["Completada", "Verificada"] },
      fecha_fin_real: { [Op.between]: [start, end] },
    },
    include: [
      { model: models.TipoActividad, attributes: ["nombre"], required: false },
      {
        model: models.Lote,
        attributes: ["nombre"],
        required: false,
        include: [
          // ✅ para poder mostrar FINCA en la tabla
          { model: models.Finca, as: "finca", attributes: ["nombre"], required: false },
        ],
      },
      {
        model: models.TareaAsignacion,
        attributes: ["rol_en_tarea"],
        required: true,
        where: { usuario_id: det.trabajador_id, rol_en_tarea: "Ejecutor" },
      },
    ],
    order: [
      ["fecha_fin_real", "ASC"],
      ["id", "ASC"],
    ],
  });

  // =========================
  // 4) PDF headers (descarga/inline)
  // =========================
  const filename = `recibo_${nomina.semana_iso}_${t.cedula || t.id}.pdf`;
  setPdfHeaders(res, filename, download);

  const doc = new PDFDocument({ size: "A4", margin: 50 });
  doc.pipe(res);

  // =========================
  // helpers layout
  // =========================
  const pageW = doc.page.width;
  const pageH = doc.page.height;
  const margin = doc.page.margins.left;
  const right = pageW - doc.page.margins.right;
  const bottom = pageH - doc.page.margins.bottom;
  const contentW = right - margin;

  const hr = (yy) => {
    doc.save();
    doc.strokeColor("#000").lineWidth(1);
    doc.moveTo(margin, yy).lineTo(right, yy).stroke();
    doc.restore();
  };

  const ensureSpace = (needed, onNewPage) => {
    if (doc.y + needed <= bottom) return;
    doc.addPage();
    doc.y = doc.page.margins.top;
    onNewPage?.();
  };

  const fmtDate = (d) => {
    try {
      const x = new Date(d);
      return x.toISOString().slice(0, 10);
    } catch {
      return "-";
    }
  };

  // =========================
  // ✅ Helper genérico para tabla estilo “Word”
  // =========================
  const drawTable = ({
    title = null,
    columns = [], // [{ key, label, width, align }]
    rows = [],    // [{key: value}]
    yStart,
    headerBg = "#d9d9d9",
    fontSize = 10,
    rowPadY = 6,
    rowPadX = 6,
    minRowH = 24,
  }) => {
    let y = yStart;

    if (title) {
      doc.font("Helvetica-Bold").fontSize(12).fillColor("#000").text(title, margin, y);
      y += 14;
    }

    const tableX = margin;
    const tableW = contentW;

    const colXs = [tableX];
    for (const c of columns) colXs.push(colXs[colXs.length - 1] + c.width);

    const drawHeader = () => {
      ensureSpace(40);

      // fondo
      doc.save();
      doc.rect(tableX, y, tableW, minRowH).fill(headerBg);
      doc.restore();

      // borde exterior
      doc.rect(tableX, y, tableW, minRowH).strokeColor("#000").lineWidth(1).stroke();

      // líneas verticales
      for (let i = 1; i < colXs.length - 1; i++) {
        doc.moveTo(colXs[i], y).lineTo(colXs[i], y + minRowH).stroke();
      }

      doc.font("Helvetica-Bold").fontSize(fontSize).fillColor("#000");
      for (let i = 0; i < columns.length; i++) {
        const c = columns[i];
        const x = colXs[i];
        doc.text(String(c.label), x + rowPadX, y + rowPadY, {
          width: c.width - rowPadX * 2,
          align: c.align || "left",
        });
      }

      y += minRowH;
    };

    const calcRowH = (rowObj) => {
      doc.font("Helvetica").fontSize(fontSize);
      let maxH = minRowH;

      for (let i = 0; i < columns.length; i++) {
        const c = columns[i];
        const x = colXs[i];
        const raw = rowObj[c.key];
        const txt = raw === null || raw === undefined || raw === "" ? "-" : String(raw);

        const h = doc.heightOfString(txt, {
          width: c.width - rowPadX * 2,
          align: c.align || "left",
        });

        const needed = Math.max(minRowH, h + rowPadY * 2);
        if (needed > maxH) maxH = needed;
      }
      return maxH;
    };

    const drawRow = (rowObj) => {
      const rowH = calcRowH(rowObj);
      ensureSpace(rowH + 12, () => drawHeader());

      // borde exterior fila
      doc.rect(tableX, y, tableW, rowH).strokeColor("#000").lineWidth(1).stroke();

      // líneas verticales
      for (let i = 1; i < colXs.length - 1; i++) {
        doc.moveTo(colXs[i], y).lineTo(colXs[i], y + rowH).stroke();
      }

      doc.font("Helvetica").fontSize(fontSize).fillColor("#000");
      for (let i = 0; i < columns.length; i++) {
        const c = columns[i];
        const x = colXs[i];
        const raw = rowObj[c.key];
        const txt = raw === null || raw === undefined || raw === "" ? "-" : String(raw);

        doc.text(txt, x + rowPadX, y + rowPadY, {
          width: c.width - rowPadX * 2,
          align: c.align || "left",
        });
      }

      y += rowH;
    };

    drawHeader();
    if (!rows.length) {
      drawRow(Object.fromEntries(columns.map((c) => [c.key, "—"])));
    } else {
      for (const r of rows) drawRow(r);
    }

    return y;
  };

  // =========================
  // HEADER
  // =========================
  const logoPath = path.join(__dirname, "../../assets/Logo-FM.png");
  const topY = 20;

  if (fs.existsSync(logoPath)) doc.image(logoPath, margin, topY, { width: 30 });

  doc
    .font("Helvetica")
    .fontSize(13)
    .fillColor("#6b7280")
    .text("FINCA LA MAGDALENA", margin, topY + 22, { width: contentW, align: "center" });

  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .fillColor("#000")
    .text("Recibo de Pago - Finca La Magdalena", margin, topY + 55, {
      width: contentW,
      align: "center",
    });

  let y = topY + 80;
  hr(y);

  // =========================
  // FICHA (2 columnas)
  // =========================
  y += 20;

  const gapCols = 20;
  const colWL = Math.floor((contentW - gapCols) * 0.58);
  const colWR = contentW - gapCols - colWL;

  const colLx = margin;
  const colRx = margin + colWL + gapCols;

  const labelW = 85;
  const rowH = 22;

  const writePair = (x, colW, yRow, label, value) => {
    doc.font("Helvetica-Bold").fontSize(12).fillColor("#000").text(label, x, yRow, { width: labelW });

    const valueW = colW - labelW;
    doc.font("Helvetica").fillColor("#000").fontSize(12);
    if (doc.widthOfString(String(value || "-")) > valueW) doc.fontSize(11);

    doc.text(value || "-", x + labelW, yRow, { width: valueW, lineBreak: false });
  };

  writePair(colLx, colWL, y, "Semana:", nomina.semana_iso);
  writePair(colRx, colWR, y, "Estado:", nomina.estado);

  y += rowH;
  writePair(colLx, colWL, y, "Periodo:", `${nomina.fecha_inicio} al ${nomina.fecha_fin}`);
  writePair(colRx, colWR, y, "Aprobado por:", aprobadorNombre);

  y += rowH + 10;
  hr(y);

  // =========================
  // TRABAJADOR
  // =========================
  y += 22;
  doc.font("Helvetica-Bold").fontSize(13).fillColor("#000").text("Trabajador", margin, y);
  y += 18;

  const tLabelW = 120;
  const tValW = Math.floor(contentW * 0.65);

  const tRow = (label, value) => {
    doc.font("Helvetica-Bold").fontSize(12).text(label, margin, y, { width: tLabelW });
    doc.font("Helvetica").fontSize(12).text(value || "-", margin + tLabelW, y, { width: tValW });
    y += 18;
  };

  tRow("Nombre:", nombre);
  tRow("Cédula:", t.cedula || "-");
  tRow("Cargo:", cargo);
  tRow("Días trabajados:", String(det.dias_laborados ?? 0));
  tRow("Días:", diasTexto);
  tRow("Método de pago:", metodoPagoTxt);

  y += 10;
  hr(y);

  // =========================
  // ✅ DETALLE DE PAGO (TABLA estilo Word)
  // =========================
  y += 18;

  const detailCols = (() => {
    const wTotal = contentW;
    const wNum = 40;
    const wAjustes = 90;
    const wTotalCol = 100;
    const wDias = 120;
    const wTareas = wTotal - (wNum + wDias + wAjustes + wTotalCol);
    return [
      { key: "n", label: "#", width: wNum, align: "left" },
      { key: "tareas", label: "Tareas completadas", width: wTareas, align: "left" },
      { key: "dias", label: "Días trabajados", width: wDias, align: "left" },
      { key: "ajustes", label: "Ajustes", width: wAjustes, align: "right" },
      { key: "total", label: "Total", width: wTotalCol, align: "right" },
    ];
  })();

  const detailRows = [
    {
      n: "1",
      tareas: String(det.tareas_completadas || 0),
      dias: String(det.dias_laborados ?? 0),
      ajustes: money(ajustesMonto),
      total: money(det.monto_total),
    },
  ];

  y = drawTable({
    title: "Detalle de Pago",
    columns: detailCols,
    rows: detailRows,
    yStart: y,
    headerBg: "#d9d9d9",
    fontSize: 10,
    minRowH: 24,
  });

  // TOTAL GENERAL (como en tu ejemplo)
  y += 14;
  ensureSpace(30);

  doc.font("Helvetica-Bold").fontSize(12).fillColor("#000");
  doc.text(`TOTAL GENERAL: ${money(det.monto_total)}`, margin, y, { width: contentW, align: "right" });

  // =========================
  // ✅ TAREAS REALIZADAS (TABLA)
  // =========================
  y += 26;
  ensureSpace(140);

  doc.font("Helvetica-Bold").fontSize(12).fillColor("#000").text("Tareas realizadas", margin, y);
  y += 14;

  const tareasCols = (() => {
    const wTotal = contentW;
    const wFecha = 90;
    const wTipo = 120;
    const wFinca = 120;
    const wLote = 90;
    const wDetalle = wTotal - (wFecha + wTipo + wFinca + wLote);
    return [
      { key: "fecha", label: "Fecha", width: wFecha, align: "left" },
      { key: "tipo", label: "Tipo", width: wTipo, align: "left" },
      { key: "finca", label: "Finca", width: wFinca, align: "left" },
      { key: "lote", label: "Lote", width: wLote, align: "left" },
      { key: "detalle", label: "Detalle", width: wDetalle, align: "left" },
    ];
  })();

  const tareasRows = tareas.map((ta) => {
    const fecha = ta.fecha_fin_real ? fmtDate(ta.fecha_fin_real) : fmtDate(ta.fecha_programada);
    const tipoNom = ta.TipoActividad?.nombre || "-";

    // ✅ Lote y Finca (según tus associations: Lote belongsTo Finca as 'finca')
    const loteNom = ta.Lote?.nombre || "-";
    const fincaNom = ta.Lote?.finca?.nombre || "-";

    const detalle = (ta.titulo || "").trim() || "-";
    return { fecha, tipo: tipoNom, finca: fincaNom, lote: loteNom, detalle };
  });

  y = drawTable({
    title: null,
    columns: tareasCols,
    rows: tareasRows,
    yStart: y,
    headerBg: "#d9d9d9",
    fontSize: 10,
    minRowH: 24,
  });

  // =========================
  // OBSERVACIONES
  // =========================
  if (det.comprobante) {
    y += 14;
    ensureSpace(90);

    hr(y);
    y += 14;

    doc.font("Helvetica-Bold").fontSize(12).text("Observaciones", margin, y);
    y += 14;

    doc.font("Helvetica").fontSize(10);
    doc.text(String(det.comprobante), margin, y, { width: contentW });
  }

  // =========================
  // FOOTER
  // =========================
  const footerY = pageH - doc.page.margins.bottom - 25;
  doc.save();
  doc.strokeColor("#000").lineWidth(1);
  doc.moveTo(margin, footerY).lineTo(right, footerY).stroke();
  doc.restore();

  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor("#000")
    .text("Documento generado automáticamente por el Sistema de Gestión Agronómica.", margin, footerY + 8, {
      width: contentW,
    });

  doc.end();
};



// =====================
// REPORTE SEMANAL PDF - STREAM (descarga directa)
// GET /pagos/semana/:nominaId/reporte?download=true
// =====================

exports.reporteSemanaPDFStream = async (nominaId, { download = false, res }) => {
  const nomina = await models.NominaSemana.findByPk(nominaId, {
    include: [{ model: models.Usuario, as: "Aprobador", attributes: ["nombres", "apellidos"] }],
  });
  if (!nomina) throw notFound("Semana no encontrada");

  const detalles = await models.NominaDetalle.findAll({
    where: { nomina_id: nomina.id, excluido: false },
    include: [
      {
        model: models.Usuario,
        as: "Trabajador",
        attributes: ["nombres", "apellidos", "cedula", "tipo"],
        include: [{ model: models.Role, attributes: ["nombre"] }],
      },
    ],
    order: [["trabajador_id", "ASC"]],
  });

  const aprobadorNombre =
    nomina.Aprobador ? `${nomina.Aprobador.nombres} ${nomina.Aprobador.apellidos}` : "Pendiente";

  const filename = `reporte_nomina_${nomina.semana_iso}.pdf`;
  setPdfHeaders(res, filename, download);

  const doc = new PDFDocument({ size: "A4", margin: 50 });
  doc.pipe(res);

  // helpers
  const pageW = doc.page.width;
  const pageH = doc.page.height;
  const margin = doc.page.margins.left; // 50
  const right = pageW - doc.page.margins.right;
  const bottom = pageH - doc.page.margins.bottom;
  const contentW = right - margin;

  const hr = (y) => {
    doc.save();
    doc.strokeColor("#000").lineWidth(1);
    doc.moveTo(margin, y).lineTo(right, y).stroke();
    doc.restore();
  };

  const ensureSpace = (needed, onNewPage) => {
    if (doc.y + needed <= bottom) return;
    doc.addPage();
    doc.y = doc.page.margins.top;
    onNewPage?.();
  };

  // =========================
  // HEADER
  // =========================
  const logoPath = path.join(__dirname, "../../assets/Logo-FM.png");
  const topY = 20;

  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, margin, topY, { width: 30 });
  }

  doc
    .font("Helvetica")
    .fontSize(13)
    .fillColor("#6b7280")
    .text("FINCA LA MAGDALENA", margin, topY + 22, { width: contentW, align: "center" });

  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .fillColor("#000")
    .text("Reporte de Nómina - Finca La Magdalena", margin, topY + 55, {
      width: contentW,
      align: "center",
    });

  let y = topY + 80;
  hr(y);

  // =========================
  // FICHA (2 columnas, ALINEADO)
  // =========================
  y += 20;

 const gapCols = 20;

// ✅ izquierda más ancha que derecha (evita que Periodo se parta)
const colWL = Math.floor((contentW - gapCols) * 0.58);
const colWR = (contentW - gapCols) - colWL;

const colLx = margin;
const colRx = margin + colWL + gapCols;

const labelW = 85;     // un poquito más, y consistente
const rowH = 22;

const writePair = (x, colW, yRow, label, value) => {
  doc.font("Helvetica-Bold").fontSize(12).fillColor("#000")
    .text(label, x, yRow, { width: labelW });

  const valueW = colW - labelW;
  doc.font("Helvetica").fillColor("#000");
doc.fontSize(12);
if (doc.widthOfString(String(value || "-")) > valueW) doc.fontSize(11);

doc.text(value || "-", x + labelW, yRow, {
  width: valueW,
  lineBreak: false,
});

};

  writePair(colLx, colWL, y, "Semana:", nomina.semana_iso);
  writePair(colRx, colWR, y, "Estado:", nomina.estado);

  y += rowH;
  writePair(colLx, colWL, y, "Periodo:", `${nomina.fecha_inicio} al ${nomina.fecha_fin}`);
  writePair(colRx, colWR, y, "Aprobado por:", aprobadorNombre);
  y += rowH + 10;
  hr(y);

  // =========================
  // RESUMEN (mejor alineado)
  // =========================
  y += 22;

  const totalNomina = detalles.reduce((acc, d) => acc + Number(d.monto_total || 0), 0);
  const totalTareas = detalles.reduce((acc, d) => acc + Number(d.tareas_completadas || 0), 0);

  doc.font("Helvetica-Bold").fontSize(13).fillColor("#000").text("Resumen", margin, y);

  y += 18;

  // mini grid (2 columnas)
  const sumLabelW = 170;
  const sumValueW = 120;

  const sumRow = (label, value) => {
    doc.font("Helvetica-Bold").fontSize(12).text(label, margin, y, { width: sumLabelW });
    doc.font("Helvetica").fontSize(12).text(value, margin + sumLabelW, y, { width: sumValueW, align: "left" });
    y += 18;
  };

  sumRow("Trabajadores incluidos:", String(detalles.length));
  sumRow("Total tareas completadas:", String(totalTareas));
  sumRow("Total nómina:", money(totalNomina));

  y += 10;
  hr(y);
// =========================
// TABLA (AUTO AJUSTADA A4)
// =========================
y += 18;

const PAD = 4;
const FONT_HEADER = 10;
const FONT_ROW = 10;

doc.font("Helvetica").fontSize(FONT_ROW);

// helpers ancho texto
const w = (s) => doc.widthOfString(String(s ?? ""));
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

// 1) Valores por fila (para medir anchos)
const rows = detalles.map((d, i) => {
  const t = d.Trabajador;
  const role = t?.Role?.nombre || "Sin rol";
  const tipo = t?.tipo ? ` (${t.tipo})` : "";
  return {
    idx: String(i + 1),
    trabajador: `${t?.nombres || ""} ${t?.apellidos || ""}`.trim() || "-",
    cedula: t?.cedula || "-",
    cargo: `${role}${tipo}`,
    tareas: String(d.tareas_completadas || 0),
    total: money(d.monto_total),
  };
});

// 2) Medir anchos SOLO por contenido (NO por header)
const maxIdx = Math.max(...rows.map((r) => w(r.idx)), w("0"));
const maxTrab = Math.max(...rows.map((r) => w(r.trabajador)), w("-"));
const maxCed = Math.max(...rows.map((r) => w(r.cedula)), w("-"));
const maxCargo = Math.max(...rows.map((r) => w(r.cargo)), w("-"));
const maxTareas = Math.max(...rows.map((r) => w(r.tareas)), w("0"));
const maxTotal = Math.max(...rows.map((r) => w(r.total)), w("$0.00"));

// 3) Anchos propuestos (texto + padding izq/der + extra)
const COL = {
  idx: Math.ceil(maxIdx + PAD * 2 + 6),
  trabajador: Math.ceil(maxTrab + PAD * 2 + 10),
  cedula: Math.ceil(maxCed + PAD * 2 + 10),
  cargo: Math.ceil(maxCargo + PAD * 2 + 10),
  tareas: Math.ceil(maxTareas + PAD * 2 + 10),
  total: Math.ceil(maxTotal + PAD * 2 + 14),
};

// 4) Límites para que se vea “pro” (y no columnas absurdas)
COL.idx = clamp(COL.idx, 26, 40);
COL.cedula = clamp(COL.cedula, 90, 130);
COL.tareas = clamp(COL.tareas, 45, 70);
COL.total = clamp(COL.total, 95, 140);
COL.cargo = clamp(COL.cargo, 110, 170);

// trabajador ocupa lo que quede, pero con mínimo decente
const fixedW = COL.idx + COL.cedula + COL.cargo + COL.tareas + COL.total;
COL.trabajador = clamp(contentW - fixedW, 180, 9999);

// 5) Normalizar: si aún así no suma exacto, ajusta trabajador
const sumW = COL.idx + COL.trabajador + COL.cedula + COL.cargo + COL.tareas + COL.total;
if (sumW !== contentW) {
  COL.trabajador += (contentW - sumW);
}

const tableX = margin;
const tableW = contentW;
const headerH = 24;

const drawHeader = () => {
  doc.save();
  doc.rect(tableX, y, tableW, headerH).fill("#e5e7eb");
  doc.restore();

  doc.rect(tableX, y, tableW, headerH).strokeColor("#000").lineWidth(1).stroke();

  // verticales (incluye final)
  let x = tableX;
  const cuts = [COL.idx, COL.trabajador, COL.cedula, COL.cargo, COL.tareas, COL.total];
  for (const cw of cuts) {
    x += cw;
    doc.moveTo(x, y).lineTo(x, y + headerH).stroke();
  }

  // header text (SIEMPRE una línea)
  doc.font("Helvetica-Bold").fontSize(FONT_HEADER).fillColor("#000");
  x = tableX;

  doc.text("#", x + PAD, y + 7, { width: COL.idx - PAD * 2, lineBreak: false });
  x += COL.idx;

  doc.text("Trabajador", x + PAD, y + 7, { width: COL.trabajador - PAD * 2, lineBreak: false });
  x += COL.trabajador;

  doc.text("Cédula", x + PAD, y + 7, { width: COL.cedula - PAD * 2, lineBreak: false });
  x += COL.cedula;

  doc.text("Cargo", x + PAD, y + 7, { width: COL.cargo - PAD * 2, lineBreak: false });
  x += COL.cargo;

  doc.text("Tareas", x + PAD, y + 7, { width: COL.tareas - PAD * 2, align: "right", lineBreak: false });
  x += COL.tareas;

  doc.text("Total", x + PAD, y + 7, { width: COL.total - PAD * 2, align: "right", lineBreak: false });

  y += headerH;
};

const drawRow = (r) => {
  ensureSpace(rowH + 10, () => drawHeader());

  doc.rect(tableX, y, tableW, rowH).strokeColor("#000").lineWidth(1).stroke();

  let x = tableX;
  const cuts = [COL.idx, COL.trabajador, COL.cedula, COL.cargo, COL.tareas, COL.total];
  for (const cw of cuts) {
    x += cw;
    doc.moveTo(x, y).lineTo(x, y + rowH).stroke();
  }

  doc.font("Helvetica").fontSize(FONT_ROW).fillColor("#000");
  x = tableX;

  doc.text(r.idx, x + PAD, y + 6, { width: COL.idx - PAD * 2, lineBreak: false });
  x += COL.idx;

  doc.text(r.trabajador, x + PAD, y + 6, { width: COL.trabajador - PAD * 2, lineBreak: false });
  x += COL.trabajador;

  doc.text(r.cedula, x + PAD, y + 6, { width: COL.cedula - PAD * 2, lineBreak: false });
  x += COL.cedula;

  doc.text(r.cargo, x + PAD, y + 6, { width: COL.cargo - PAD * 2, lineBreak: false });
  x += COL.cargo;

  doc.text(r.tareas, x + PAD, y + 6, { width: COL.tareas - PAD * 2, align: "right", lineBreak: false });
  x += COL.tareas;

  doc.text(r.total, x + PAD, y + 6, { width: COL.total - PAD * 2, align: "right", lineBreak: false });

  y += rowH;
};

drawHeader();
for (const r of rows) drawRow(r);


  // =========================
  // TOTAL GENERAL (abajo izquierda)
  // =========================
  y += 18;
  ensureSpace(40);

  doc.font("Helvetica-Bold").fontSize(13).fillColor("#000");
  doc.text(`TOTAL GENERAL: ${money(totalNomina)}`, margin, y,{width: contentW, align: "right"});

  
  // =========================
  // FOOTER
  // =========================
  const footerY = pageH - doc.page.margins.bottom - 25;
  doc.save();
  doc.strokeColor("#000").lineWidth(1);
  doc.moveTo(margin, footerY).lineTo(right, footerY).stroke();
  doc.restore();

  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor("#000")
    .text("Documento generado automáticamente por el Sistema de Gestión Agronómica.", margin, footerY + 8, {
      width: contentW,
    });

  doc.end();
};
