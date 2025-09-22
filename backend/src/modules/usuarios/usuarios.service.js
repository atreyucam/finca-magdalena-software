const { Op } = require('sequelize');
const { models } = require('../../db');
const { hashPassword } = require('../../utils/crypto');


function forbid(message = 'Prohibido') {
const e = new Error(message); e.status = 403; e.code = 'FORBIDDEN'; return e;
}


function badRequest(message = 'Solicitud inválida') {
const e = new Error(message); e.status = 400; e.code = 'BAD_REQUEST'; return e;
}

exports.crearUsuario = async (currentUser, data) => {
const { cedula, nombres, apellidos, email, telefono, direccion, fecha_ingreso, role, password } = data;
if (!cedula || !nombres || !apellidos || !email || !role || !password) throw badRequest('Faltan campos obligatorios');


// Regla: Tecnico solo crea Trabajador
if (currentUser.role === 'Tecnico' && role !== 'Trabajador') {
throw forbid('El técnico solo puede crear usuarios con rol Trabajador.');
}


const roleRow = await models.Role.findOne({ where: { nombre: role } });
if (!roleRow) throw badRequest('Rol inválido');


try {
const usuario = await models.Usuario.create({
cedula, nombres, apellidos, email, telefono, direccion, fecha_ingreso,
role_id: roleRow.id,
password_hash: await hashPassword(password),
});
return {
id: usuario.id,
cedula, nombres, apellidos, email, telefono, direccion, fecha_ingreso,
role: roleRow.nombre,
estado: usuario.estado,
};
} catch (err) {
if (err.name === 'SequelizeUniqueConstraintError') {
err.status = 409; err.code = 'DUPLICATE'; err.message = 'Cédula o email ya existen';
}
throw err;
}
};

exports.listarUsuarios = async ({ q, estado, role, page = 1, pageSize = 20 }) => {
const where = {};
if (role) {
  where['$Role.nombre$'] = role;  // Sequelize con include
}

if (estado) where.estado = estado;
if (q) {
where[Op.or] = [
{ nombres: { [Op.iLike]: `%${q}%` } },
{ apellidos: { [Op.iLike]: `%${q}%` } },
{ email: { [Op.iLike]: `%${q}%` } },
{ cedula: { [Op.iLike]: `%${q}%` } },
];
}
const offset = (page - 1) * pageSize;
const { rows, count } = await models.Usuario.findAndCountAll({
where,
include: [{ model: models.Role, attributes: ['nombre'] }],
order: [['created_at','DESC']],
limit: pageSize,
offset,
});
return {
total: count,
page,
pageSize,
data: rows.map(u => ({
id: u.id,
cedula: u.cedula,
nombres: u.nombres,
apellidos: u.apellidos,
email: u.email,
telefono: u.telefono,
direccion: u.direccion,
fecha_ingreso: u.fecha_ingreso,
estado: u.estado,
role: u.Role?.nombre,
}))
};
};

exports.obtenerUsuario = async (id) => {
const u = await models.Usuario.findByPk(id, { include: [{ model: models.Role, attributes: ['nombre'] }] });
if (!u) return null;
return {
id: u.id,
cedula: u.cedula,
nombres: u.nombres,
apellidos: u.apellidos,
email: u.email,
telefono: u.telefono,
direccion: u.direccion,
fecha_ingreso: u.fecha_ingreso,
estado: u.estado,
role: u.Role?.nombre,
};
};


exports.editarUsuario = async (currentUser, id, data) => {
const u = await models.Usuario.findByPk(id, { include: [{ model: models.Role }] });
if (!u) { const e = new Error('Usuario no encontrado'); e.status = 404; throw e; }


// Rol destino (si viene)
if (typeof data.role === 'string') {
if (currentUser.role === 'Tecnico' && data.role !== 'Trabajador') throw forbid('El técnico solo puede asignar rol Trabajador');
const newRole = await models.Role.findOne({ where: { nombre: data.role } });
if (!newRole) throw badRequest('Rol inválido');
u.role_id = newRole.id;
}


// Campos editables
const fields = ['cedula','nombres','apellidos','email','telefono','direccion','fecha_ingreso','estado'];
for (const f of fields) if (f in data) u[f] = data[f];


// Cambio de password (opcional)
if (data.password) u.password_hash = await hashPassword(data.password);


try {
await u.save();
const roleRow = await models.Role.findByPk(u.role_id);
return {
id: u.id,
cedula: u.cedula,
nombres: u.nombres,
apellidos: u.apellidos,
email: u.email,
telefono: u.telefono,
direccion: u.direccion,
fecha_ingreso: u.fecha_ingreso,
estado: u.estado,
role: roleRow?.nombre,
};
} catch (err) {
if (err.name === 'SequelizeUniqueConstraintError') { err.status = 409; err.code = 'DUPLICATE'; err.message = 'Cédula o email ya existen'; }
throw err;
}
};


exports.desactivarUsuario = async (currentUser, id) => {
const u = await models.Usuario.findByPk(id);
if (!u) { const e = new Error('Usuario no encontrado'); e.status = 404; throw e; }
u.estado = 'Inactivo';
await u.save();
return { id: u.id, estado: u.estado };
};



exports.obtenerEstadisticas = async () => {
  const registrados = await models.Usuario.count();
  const activos = await models.Usuario.count({ where: { estado: 'Activo' } });
  const inactivos = await models.Usuario.count({ where: { estado: ['Inactivo','Bloqueado'] } });
  return { registrados, activos, inactivos };
};


exports.obtenerPagosUsuario = async (id) => {
  const detalles = await models.NominaDetalle.findAll({
    where: { trabajador_id: id },
    include: [{ model: models.NominaSemana }],
    order: [[{ model: models.NominaSemana }, 'fecha_inicio', 'DESC']]
  });

  return detalles.map(d => ({
    id: d.id,
    semana_iso: d.NominaSemana?.semana_iso,
    fecha_inicio: d.NominaSemana?.fecha_inicio,
    fecha_fin: d.NominaSemana?.fecha_fin,
    estado_pago: d.NominaSemana?.estado,
    monto_total: d.monto_total,
    aprobado_at: d.NominaSemana?.aprobado_at,
  }));
};



exports.obtenerTareasUsuario = async (id) => {
  const asignaciones = await models.TareaAsignacion.findAll({
    where: { usuario_id: id },
    include: [
      { model: models.Tarea, include: [models.TipoActividad, models.Lote] }
    ],
    order: [[{ model: models.Tarea }, 'fecha_programada', 'DESC']]
  });

  return asignaciones.map(a => ({
    id: a.Tarea.id,
    tipo: a.Tarea.TipoActividad?.nombre,
    lote: a.Tarea.Lote?.nombre,
    estado: a.Tarea.estado,
    fecha_programada: a.Tarea.fecha_programada,
  }));
};
