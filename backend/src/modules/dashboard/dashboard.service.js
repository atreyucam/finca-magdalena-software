const { Op, fn, col } = require('sequelize');
const { models } = require('../../db');
const { getISOWeek, getRangeFromISO } = require('../../utils/week');


function todayISO(){ const d=new Date(); d.setHours(0,0,0,0); return d.toISOString().slice(0,10); }


exports.obtener = async (currentUser) => {
const hoy = todayISO();
const semana_iso = getISOWeek(hoy);
const se = getRangeFromISO(semana_iso);


// Base filtros por rol
const whereHoy = { fecha_programada: hoy };
const includeAsign = [];
if (currentUser.role === 'Trabajador') {
includeAsign.push({ model: models.TareaAsignacion, where: { usuario_id: currentUser.sub }, required: true });
} else {
includeAsign.push({ model: models.TareaAsignacion, required: false });
}


const tareasHoy = await models.Tarea.findAll({
where: whereHoy,
include: [ { model: models.TipoActividad, attributes: ['nombre'] }, { model: models.Lote, attributes: ['nombre'] }, ...includeAsign ],
order: [['id','DESC']]
});


const contadores = {
pendientes: await models.Tarea.count({ where: { ...whereHoy, estado: 'Pendiente' } }),
asignadas: await models.Tarea.count({ where: { ...whereHoy, estado: 'Asignada' } }),
completadas: await models.Tarea.count({ where: { ...whereHoy, estado: 'Completada' } }),
verificadas: await models.Tarea.count({ where: { ...whereHoy, estado: 'Verificada' } })
};


const alertasStock = await models.InventarioItem.findAll({ where: { stock_actual: { [Op.lt]: col('stock_minimo') } }, order: [['stock_actual','ASC']], limit: 10 });


const novedadesRecientes = await models.Novedad.findAll({
where: { created_at: { [Op.gte]: new Date(Date.now() - 3*24*60*60*1000) } },
include: [ { model: models.Tarea, include: [{ model: models.Lote, attributes: ['nombre'] }, { model: models.TipoActividad, attributes: ['nombre'] }] }, { model: models.Usuario, attributes: ['nombres','apellidos'] } ],
order: [['created_at','DESC']],
limit: 10
});


const pendientesVerificar = currentUser.role !== 'Trabajador' ? await models.Tarea.count({ where: { estado: 'Completada' } }) : undefined;


const nomina = await models.NominaSemana.findOne({ where: { semana_iso }, attributes: ['id','estado'] });


const notifsUnread = await models.Notificacion.count({ where: { usuario_id: currentUser.sub, leida: false } });


return {
fecha: hoy,
semana_iso,
nomina_estado: nomina?.estado || 'Borrador',
contadores,
tareas_hoy: tareasHoy.map(t => ({ id: t.id, tipo: t.TipoActividad?.nombre, lote: t.Lote?.nombre, estado: t.estado, asignados: (t.TareaAsignacions||[]).map(a=>a.usuario_id) })),
pendientes_verificar: pendientesVerificar,
alertas_stock: alertasStock.map(i => ({ id: i.id, nombre: i.nombre, stock_actual: i.stock_actual, stock_minimo: i.stock_minimo, unidad_id: i.unidad_id })),
novedades: novedadesRecientes.map(n => ({ id: n.id, texto: n.texto, created_at: n.created_at, tarea: { id: n.Tarea?.id, lote: n.Tarea?.Lote?.nombre, tipo: n.Tarea?.TipoActividad?.nombre }, autor: n.Usuario ? `${n.Usuario.nombres} ${n.Usuario.apellidos}` : null })),
notificaciones_no_leidas: notifsUnread
};
};