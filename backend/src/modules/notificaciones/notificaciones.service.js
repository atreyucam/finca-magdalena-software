const { models } = require('../../db');


exports.crear = async (usuario_id, { tipo='General', titulo, mensaje='', referencia={}, prioridad='Info' }) => {
if (!usuario_id || !titulo) return null;
const notif = await models.Notificacion.create({ usuario_id, tipo, titulo, mensaje, referencia, prioridad });
return notif.toJSON();
};


exports.crearParaRoles = async (roles = [], payload = {}) => {
if (!Array.isArray(roles) || roles.length === 0) return [];
const users = await models.Usuario.findAll({ include: [{ model: models.Role, where: { nombre: roles } }], where: { estado: 'Activo' }, attributes: ['id'] });
const res = [];
for (const u of users) res.push(await exports.crear(u.id, payload));
return res;
};


exports.listar = async (currentUser, { soloNoLeidas=false, limit=20, offset=0 }) => {
const where = { usuario_id: currentUser.sub };
if (String(soloNoLeidas) === 'true') where.leida = false;
const list = await models.Notificacion.findAll({ where, order: [['created_at','DESC']], limit: +limit, offset: +offset });
return list.map(n => ({ id: n.id, tipo: n.tipo, titulo: n.titulo, mensaje: n.mensaje, referencia: n.referencia, leida: n.leida, prioridad: n.prioridad, created_at: n.created_at }));
};


exports.marcarLeida = async (currentUser, id) => {
const n = await models.Notificacion.findByPk(id);
if (!n || n.usuario_id !== currentUser.sub) return null;
n.leida = true; await n.save();
return { id: n.id, leida: n.leida };
};


exports.marcarTodas = async (currentUser) => {
await models.Notificacion.update({ leida: true }, { where: { usuario_id: currentUser.sub, leida: false } });
return { ok: true };
};