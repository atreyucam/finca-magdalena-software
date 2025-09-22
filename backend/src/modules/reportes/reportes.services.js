// backend/src/modules/reportes/reportes.service.js
const PDFDocument = require('pdfkit');
const { Op, fn, col, literal } = require('sequelize');
const { models } = require('../../db');


function csvEscape(v){ if (v==null) return ''; const s=String(v); return /[",\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s; }
function sendCSV(res, filename, headers, rows){
const lines = [headers.map(csvEscape).join(',')].concat(rows.map(r => headers.map(h => csvEscape(r[h])).join(',')));
res.setHeader('Content-Type','text/csv');
res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
res.send(lines.join('\n'));
}


exports.reporteTareas = async (req,res) => {
const { desde, hasta, lote_id, trabajador_id, export: fmt } = req.query;
const whereT = {};
if (lote_id) whereT.lote_id = +lote_id;
if (desde && hasta) whereT.fecha_programada = { [Op.between]: [desde, hasta] };
else if (desde) whereT.fecha_programada = { [Op.gte]: desde };
else if (hasta) whereT.fecha_programada = { [Op.lte]: hasta };


const include = [ { model: models.TipoActividad, attributes: ['nombre','codigo'] }, { model: models.Lote, attributes: ['nombre'] } ];
if (trabajador_id) include.push({ model: models.TareaAsignacion, where: { usuario_id: +trabajador_id }, required: true });
else include.push({ model: models.TareaAsignacion, required: false });


const list = await models.Tarea.findAll({ where: whereT, include, order: [['fecha_programada','DESC'],['id','DESC']] });
const data = list.map(t => ({ id: t.id, fecha: t.fecha_programada, lote: t.Lote?.nombre, tipo: t.TipoActividad?.nombre, estado: t.estado, asignados: (t.TareaAsignacions||[]).map(a=>a.usuario_id).join('|') }));


if (fmt === 'csv') {
return sendCSV(res, 'reporte_tareas.csv', ['id','fecha','lote','tipo','estado','asignados'], data);
}
if (fmt === 'pdf') {
const doc = new PDFDocument({ margin: 40, size: 'A4' });
res.setHeader('Content-Type','application/pdf');
res.setHeader('Content-Disposition','attachment; filename="reporte_tareas.pdf"');
doc.pipe(res);
doc.fontSize(16).text('Reporte de Tareas', { align: 'center' });
doc.moveDown();
for (const r of data) { doc.fontSize(10).text(`${r.fecha} | Lote: ${r.lote} | ${r.tipo} | ${r.estado} | Asignados: ${r.asignados}`); }
doc.end();
return;
}
res.json({ total: data.length, data });
};

exports.reporteConsumo = async (req,res) => {
const { desde, hasta, lote_id, export: fmt } = req.query;
// sumar SALIDA por referencia.tarea_id y, si lote_id, filtrar por tareas de ese lote
const whereM = { tipo: 'SALIDA' };
if (desde && hasta) whereM.fecha = { [Op.between]: [desde, `${hasta} 23:59:59`] };
else if (desde) whereM.fecha = { [Op.gte]: desde };
else if (hasta) whereM.fecha = { [Op.lte]: `${hasta} 23:59:59` };


const include = [{ model: models.InventarioItem, attributes: ['nombre'] }, { model: models.Unidad, attributes: ['codigo'] }];


const moves = await models.InventarioMovimiento.findAll({ where: whereM, include, order: [['fecha','DESC']] });


// Si se pide por lote, necesitamos tarea_id en referencia
let data = [];
for (const m of moves) {
const ref = m.referencia || {};
if (lote_id) {
if (!ref.tarea_id) continue;
const tarea = await models.Tarea.findByPk(ref.tarea_id);
if (!tarea || tarea.lote_id !== Number(lote_id)) continue;
}
data.push({ fecha: m.fecha, item: m.InventarioItem?.nombre, cantidad: m.cantidad, unidad: m.Unidad?.codigo });
}


// Agregación por item
const agreg = {};
for (const r of data) {
const key = `${r.item}|${r.unidad}`;
agreg[key] = (agreg[key]||0) + Number(r.cantidad);
}
const rows = Object.entries(agreg).map(([k,total]) => { const [item,unidad]=k.split('|'); return { item, unidad, total: total.toFixed(3) }; });


if (fmt === 'csv') {
return sendCSV(res, 'reporte_consumo.csv', ['item','unidad','total'], rows);
}
if (fmt === 'pdf') {
const doc = new PDFDocument({ margin: 40, size: 'A4' });
res.setHeader('Content-Type','application/pdf');
res.setHeader('Content-Disposition','attachment; filename="reporte_consumo.pdf"');
doc.pipe(res);
doc.fontSize(16).text('Reporte de Consumo de Insumos', { align: 'center' });
doc.moveDown();
for (const r of rows) { doc.fontSize(12).text(`${r.item} - ${r.total} ${r.unidad}`); }
doc.end();
return;
}
res.json({ total: rows.length, data: rows });
};