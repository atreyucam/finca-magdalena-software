const { models } = require("../../db");

function forbidden(message = "No tienes permiso para acceder a esta tarea") {
  const error = new Error(message);
  error.status = 403;
  error.code = "FORBIDDEN";
  return error;
}

function notFound(message = "Tarea no encontrada") {
  const error = new Error(message);
  error.status = 404;
  error.code = "NOT_FOUND";
  return error;
}

function unauthorized(message = "Usuario inactivo o bloqueado") {
  const error = new Error(message);
  error.status = 401;
  error.code = "USER_INACTIVE";
  return error;
}

async function assertTaskResourceAccess({ tareaId, userId, userRole }) {
  const usuario = await models.Usuario.findByPk(userId, { attributes: ["id", "estado"] });
  if (!usuario || usuario.estado !== "Activo") {
    throw unauthorized();
  }

  const tarea = await models.Tarea.findByPk(tareaId, {
    attributes: ["id", "estado", "titulo", "lote_id", "cosecha_id", "creador_id"],
  });
  if (!tarea) throw notFound();

  if (["Propietario", "Tecnico"].includes(userRole)) return tarea;

  if (userRole === "Trabajador") {
    const asignacion = await models.TareaAsignacion.findOne({
      where: { tarea_id: tareaId, usuario_id: userId },
      attributes: ["id"],
    });
    if (!asignacion) throw forbidden();
    return tarea;
  }

  throw forbidden();
}

module.exports = {
  assertTaskResourceAccess,
};

