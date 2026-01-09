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
  // Extraemos 'tipo' con default a 'Fijo'
  const { cedula, nombres, apellidos, email, telefono, direccion, fecha_ingreso, role, password, tipo = 'Fijo' } = data;

  // 1. Validaciones Generales
  if (!cedula || !nombres || !apellidos || !role) {
    throw badRequest('Faltan campos obligatorios: Cédula, Nombres, Apellidos o Rol.');
  }

  // 2. Reglas de Negocio según Tipo
  if (tipo === 'Fijo') {
    // Si es Fijo, Email y Password son OBLIGATORIOS
    if (!email || !password) throw badRequest('El personal fijo requiere Email y Contraseña.');
  } else if (tipo === 'Esporadico') {
    // Si es Esporádico, SOLO puede ser Trabajador
    if (role !== 'Trabajador') throw badRequest('Los trabajadores esporádicos solo pueden tener el rol de Trabajador.');
  }

  // 3. Regla de permisos del Técnico
  if (currentUser.role === 'Tecnico' && role !== 'Trabajador') {
    throw forbid('El técnico solo puede crear usuarios con rol Trabajador.');
  }

  const roleRow = await models.Role.findOne({ where: { nombre: role } });
  if (!roleRow) throw badRequest('Rol inválido');

  try {
    // Preparamos datos condicionales
    const finalEmail = tipo === 'Fijo' ? email : null;
    const finalPasswordHash = (tipo === 'Fijo' && password) ? await hashPassword(password) : null;

    const usuario = await models.Usuario.create({
      cedula, nombres, apellidos, telefono, direccion, fecha_ingreso,
      role_id: roleRow.id,
      tipo,                 // Guardamos el tipo
      email: finalEmail,    // NULL si es esporádico
      password_hash: finalPasswordHash, // NULL si es esporádico
    });

    return {
      id: usuario.id,
      cedula, nombres, apellidos, email: finalEmail, telefono, direccion, fecha_ingreso,
      role: roleRow.nombre,
      tipo: usuario.tipo,
      estado: usuario.estado,
    };
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      err.status = 409; 
      err.code = 'DUPLICATE'; 
      err.message = 'La cédula (o el email) ya existen en el sistema.';
    }
    throw err;
  }
};

exports.listarUsuarios = async ({ q, estado, role, tipo, page = 1, pageSize = 20 }) => {
  const where = {};

  if (role) where['$Role.nombre$'] = role;
  if (estado) where.estado = estado;
  if (tipo) where.tipo = tipo;

  if (q) {
    where[Op.or] = [
      { nombres: { [Op.iLike]: `%${q}%` } },
      { apellidos: { [Op.iLike]: `%${q}%` } },
      { cedula: { [Op.iLike]: `%${q}%` } },
      { email: { [Op.iLike]: `%${q}%` } },
    ];
  }

  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safePageSize = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));

  const offset = (safePage - 1) * safePageSize;

  const { rows, count } = await models.Usuario.findAndCountAll({
    where,
    include: [{ model: models.Role, attributes: ["nombre"] }],
    order: [["id", "DESC"]], // recomendado si no tienes created_at
    limit: safePageSize,
    offset,
  });

  const totalPages = Math.max(1, Math.ceil(count / safePageSize));

  return {
    page: safePage,
    pageSize: safePageSize,
    totalItems: count,
    totalPages,
    data: rows.map((u) => ({
      id: u.id,
      cedula: u.cedula,
      nombres: u.nombres,
      apellidos: u.apellidos,
      email: u.email,
      telefono: u.telefono,
      direccion: u.direccion,
      fecha_ingreso: u.fecha_ingreso,
      estado: u.estado,
      tipo: u.tipo,
      role: u.Role?.nombre,
    })),
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
// AHORA (Eliminamos 'fecha_ingreso' para protegerla):
const fields = ['cedula','nombres','apellidos','email','telefono','direccion','estado', 'tipo'];
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
tipo: u.tipo,
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

exports.obtenerEstadisticas = async () => {
  // Contamos totales reales en la base de datos
  const registrados = await models.Usuario.count();
  const activos = await models.Usuario.count({ where: { estado: 'Activo' } });
  // Agrupamos Inactivos y Bloqueados en una sola métrica
  const inactivos = await models.Usuario.count({ where: { estado: ['Inactivo', 'Bloqueado'] } });
  
  return { registrados, activos, inactivos };
};