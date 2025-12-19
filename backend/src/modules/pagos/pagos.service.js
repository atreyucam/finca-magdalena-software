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
           tipo: "Sistema",
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
  if (det.metodo_pago !== "Otro") det.metodo_pago_otro = null;

  // Validación recomendada (según lo que definiste):
  // - Si es Transferencia o Cheque, recomendamos exigir comprobante
  if (
    (det.metodo_pago === "Transferencia" || det.metodo_pago === "Cheque") &&
    (!det.comprobante || String(det.comprobante).trim().length === 0)
  ) {
    throw badRequest("Comprobante es requerido para Transferencia o Cheque.");
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

    if (det.metodo_pago !== "Otro") det.metodo_pago_otro = null;

    if (
      (det.metodo_pago === "Transferencia" || det.metodo_pago === "Cheque") &&
      (!det.comprobante || String(det.comprobante).trim().length === 0)
    ) {
      throw badRequest(
        `Comprobante es requerido para Transferencia/Cheque (detalleId=${det.id}).`
      );
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
    
    // Formato: FM-2025W52-00001
    const codigo = `FM-${nomina.semana_iso}-${String(contador).padStart(5, '0')}`;
    d.comprobante = codigo;
    await d.save();
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



