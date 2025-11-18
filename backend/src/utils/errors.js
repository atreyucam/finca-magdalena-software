function badRequest(msg = "Solicitud inválida") {
  const e = new Error(msg);
  e.status = 400;
  e.code = "BAD_REQUEST";
  return e;
}

function unauthorized(msg = "No autorizado") {
  const e = new Error(msg);
  e.status = 401;
  e.code = "UNAUTHORIZED";
  return e;
}

function forbidden(msg = "Acceso denegado") {
  const e = new Error(msg);
  e.status = 403;
  e.code = "FORBIDDEN";
  return e;
}

function notFound(msg = "No encontrado") {
  const e = new Error(msg);
  e.status = 404;
  e.code = "NOT_FOUND";
  return e;
}

function conflict(msg = "Conflicto en la operación") {
  const e = new Error(msg);
  e.status = 409;
  e.code = "CONFLICT";
  return e;
}

module.exports = {
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
};
