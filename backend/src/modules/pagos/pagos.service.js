// backend/src/modules/pagos/pagos.service.js
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { Op, fn, col, literal, QueryTypes } = require('sequelize');
const { models, sequelize } = require('../../db');
const { getRangeFromISO } = require('../../utils/week');
const notif = require('../notificaciones/notificaciones.service');


function badRequest(m='Solicitud inválida'){ const e=new Error(m); e.status=400; e.code='BAD_REQUEST'; return e; }
function notFound(m='No encontrado'){ const e=new Error(m); e.status=404; e.code='NOT_FOUND'; return e; }
function forbidden(m='Prohibido'){ const e=new Error(m); e.status=403; e.code='FORBIDDEN'; return e; }


function calcTotal(monto_base, ajustes){
let total = Number(monto_base||0);
for (const a of (ajustes||[])) total += Number(a.monto||0);
return total.toFixed(2);
}


async function contarTareasCompletadasTrabajador(trabajador_id, desde, hasta){
  // Cuenta tareas distintas completadas en el rango y asignadas al trabajador
  const [row] = await sequelize.query(
    `SELECT COUNT(DISTINCT te.tarea_id) AS cnt
       FROM tarea_estados te
       JOIN tareas t  ON t.id  = te.tarea_id
       JOIN tarea_asignaciones ta ON ta.tarea_id = t.id
      WHERE ta.usuario_id = :uid
        AND te.estado     = 'Completada'
        AND te.fecha BETWEEN :desde AND :hasta`,
    {
      type: QueryTypes.SELECT,
      replacements: {
        uid: trabajador_id,
        desde: `${desde} 00:00:00`,
        hasta: `${hasta} 23:59:59`
      }
    }
  );
  return Number(row?.cnt || 0);
}

exports.consolidarSemana = async (currentUser, body) => {
const { semana_iso } = body || {};
if (!semana_iso) throw badRequest('semana_iso es obligatorio (p.ej. 2025-W37)');
const { start, end } = getRangeFromISO(semana_iso);


// crear o tomar existente
const [nomina, created] = await models.NominaSemana.findOrCreate({ where: { semana_iso }, defaults: { semana_iso, fecha_inicio: start, fecha_fin: end, creado_por_id: currentUser.sub } });
if (!created && nomina.estado !== 'Borrador') throw badRequest('La semana ya está aprobada. No se puede re-consolidar');


// obtener trabajadores ACTIVOS con al menos una tarea completada en la semana
const asignaciones = await models.TareaAsignacion.findAll({
  attributes: [
    [fn('DISTINCT', col('TareaAsignacion.usuario_id')), 'usuario_id']
  ],
  include: [
    {
      model: models.Tarea,
      attributes: [],
      required: true,
      include: [
        {
          model: models.TareaEstado,
          attributes: [],
          required: true,
          where: {
            estado: 'Completada',
            fecha: { [Op.between]: [start, `${end} 23:59:59`] }
          }
        }
      ]
    },
    {
      model: models.Usuario,
      attributes: [],
      required: true,
      where: { estado: 'Activo' }
    }
  ],
  raw: true
});

const trabajadoresIds = asignaciones.map(a => Number(a.usuario_id));


// crear detalles (upsert)
for (const uid of trabajadoresIds) {
const tareas = await contarTareasCompletadasTrabajador(uid, start, end);
const [det, _created] = await models.NominaDetalle.findOrCreate({
where: { nomina_id: nomina.id, trabajador_id: uid },
defaults: { nomina_id: nomina.id, trabajador_id: uid, tareas_completadas: tareas, monto_base: '0.00', ajustes: [], monto_total: '0.00' }
});
if (!_created) {
det.tareas_completadas = tareas;
det.monto_total = calcTotal(det.monto_base, det.ajustes);
await det.save();
}
}


// devolver cabecera + detalles
return await exports.obtenerSemana({ semana_iso });
};


exports.obtenerSemana = async ({ semana_iso, nomina_id }) => {
let nomina;
if (nomina_id) nomina = await models.NominaSemana.findByPk(nomina_id);
else if (semana_iso) nomina = await models.NominaSemana.findOne({ where: { semana_iso } });
if (!nomina) throw notFound('Semana no encontrada');
const detalles = await models.NominaDetalle.findAll({ where: { nomina_id: nomina.id }, include: [{ model: models.Usuario, as: 'Trabajador', attributes: ['id','nombres','apellidos'] }], order: [['trabajador_id','ASC']] });
return {
id: nomina.id,
semana_iso: nomina.semana_iso,
fecha_inicio: nomina.fecha_inicio,
fecha_fin: nomina.fecha_fin,
estado: nomina.estado,
detalles: detalles.map(d => ({
id: d.id,
trabajador: d.Trabajador ? { id: d.Trabajador.id, nombre: `${d.Trabajador.nombres} ${d.Trabajador.apellidos}` } : d.trabajador_id,
tareas_completadas: d.tareas_completadas,
monto_base: d.monto_base,
ajustes: d.ajustes,
monto_total: d.monto_total,
observaciones: d.observaciones,
recibo_pdf_path: d.recibo_pdf_path
}))
};
};


exports.editarDetalle = async (nominaId, detalleId, body) => {
const nomina = await models.NominaSemana.findByPk(nominaId);
if (!nomina) throw notFound('Semana no encontrada');
if (nomina.estado !== 'Borrador') throw badRequest('Semana aprobada, no editable');
const det = await models.NominaDetalle.findByPk(detalleId);
if (!det || det.nomina_id !== nomina.id) throw notFound('Detalle no encontrado');


const fields = ['monto_base','ajustes','observaciones'];
for (const f of fields) if (f in body) det[f] = body[f];
det.monto_total = calcTotal(det.monto_base, det.ajustes);
await det.save();
return det.toJSON();
};

exports.upsertDetalle = async (nominaId, body) => {
const { trabajador_id, monto_base='0.00', ajustes=[], observaciones } = body || {};
if (!trabajador_id) throw badRequest('trabajador_id es obligatorio');
const nomina = await models.NominaSemana.findByPk(nominaId);
if (!nomina) throw notFound('Semana no encontrada');
if (nomina.estado !== 'Borrador') throw badRequest('Semana aprobada, no editable');
const tareas = await contarTareasCompletadasTrabajador(trabajador_id, nomina.fecha_inicio, nomina.fecha_fin);
const [det, created] = await models.NominaDetalle.findOrCreate({ where: { nomina_id: nomina.id, trabajador_id }, defaults: { nomina_id: nomina.id, trabajador_id, tareas_completadas: tareas, monto_base, ajustes, monto_total: calcTotal(monto_base, ajustes), observaciones } });
if (!created) {
det.monto_base = monto_base;
det.ajustes = ajustes;
det.observaciones = observaciones;
det.tareas_completadas = tareas;
det.monto_total = calcTotal(det.monto_base, det.ajustes);
await det.save();
}
return det.toJSON();
};


exports.aprobarSemana = async (currentUser, nominaId) => {
const nomina = await models.NominaSemana.findByPk(nominaId);
if (!nomina) throw notFound('Semana no encontrada');
if (nomina.estado !== 'Borrador') throw badRequest('Ya aprobada');
nomina.estado = 'Aprobada';
nomina.aprobado_por_id = currentUser.sub;
nomina.aprobado_at = new Date();
await nomina.save();
const dets = await models.NominaDetalle.findAll({ where: { nomina_id: nomina.id } });
for (const d of dets) {
await notif.crear(d.trabajador_id, {
tipo: 'Pago',
titulo: `Pago semanal aprobado (${nomina.semana_iso})`,
mensaje: `Monto: $${Number(d.monto_total).toFixed(2)}`,
referencia: { nomina_id: nomina.id, detalle_id: d.id },
prioridad: 'Info'
});
}
return { id: nomina.id, estado: nomina.estado, aprobado_at: nomina.aprobado_at };
};

exports.generarRecibo = async (nominaId, detalleId) => {
const nomina = await models.NominaSemana.findByPk(nominaId);
if (!nomina) throw notFound('Semana no encontrada');
if (nomina.estado !== 'Aprobada') throw badRequest('Primero apruebe la semana');
const det = await models.NominaDetalle.findByPk(detalleId, { include: [{ model: models.Usuario, as: 'Trabajador', attributes: ['nombres','apellidos','cedula'] }] });
if (!det || det.nomina_id !== nomina.id) throw notFound('Detalle no encontrado');


// Generar PDF
const storageDir = path.join(__dirname, '../../storage/recibos');
if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });
const filename = `recibo_${nomina.semana_iso}_${det.trabajador_id}_${Date.now()}.pdf`;
const filepath = path.join(storageDir, filename);


const doc = new PDFDocument({ margin: 40 });
doc.pipe(fs.createWriteStream(filepath));
doc.fontSize(16).text('Recibo de Pago - Finca Magdalena', { align: 'center' });
doc.moveDown();
doc.fontSize(12).text(`Semana: ${nomina.semana_iso} (${nomina.fecha_inicio} a ${nomina.fecha_fin})`);
doc.text(`Trabajador: ${det.Trabajador?.nombres} ${det.Trabajador?.apellidos} (Cédula: ${det.Trabajador?.cedula || ''})`);
doc.moveDown();


doc.text(`Tareas completadas: ${det.tareas_completadas}`);
doc.text(`Monto base: $${Number(det.monto_base).toFixed(2)}`);
doc.moveDown();


doc.text('Ajustes:');
const aj = Array.isArray(det.ajustes) ? det.ajustes : [];
if (aj.length === 0) doc.text('- Ninguno');
for (const a of aj) {
doc.text(`• ${a.tipo || 'Ajuste'}: $${Number(a.monto||0).toFixed(2)} (${a.motivo||''})`);
}
doc.moveDown();
doc.fontSize(14).text(`TOTAL A PAGAR: $${Number(det.monto_total).toFixed(2)}`, { underline: true });
if (det.observaciones) { doc.moveDown(); doc.fontSize(12).text(`Observaciones: ${det.observaciones}`); }


doc.moveDown(2);
doc.text('Firma del propietario: ________________________________');
doc.moveDown();
doc.text('Firma del trabajador: ________________________________');


doc.end();


det.recibo_pdf_path = `/files/recibos/${filename}`;
await det.save();
await notif.crear(det.trabajador_id, {
tipo: 'Pago',
titulo: 'Recibo disponible',
mensaje: `Tu recibo de la semana ${nomina.semana_iso} está disponible`,
referencia: { nomina_id: nomina.id, detalle_id: det.id },
prioridad: 'Info'
});
return { recibo: det.recibo_pdf_path };
};


exports.misRecibos = async (currentUser) => {
if (currentUser.role !== 'Trabajador') return [];
const dets = await models.NominaDetalle.findAll({ where: { trabajador_id: currentUser.sub }, include: [{ model: models.NominaSemana }] , order: [[{ model: models.NominaSemana }, 'fecha_inicio','DESC']] });
return dets.map(d => ({ semana_iso: d.NominaSemana?.semana_iso, fecha_inicio: d.NominaSemana?.fecha_inicio, fecha_fin: d.NominaSemana?.fecha_fin, monto_total: d.monto_total, recibo_pdf_path: d.recibo_pdf_path }));
};



