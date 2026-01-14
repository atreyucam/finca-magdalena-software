const { verifyAccess } = require("../utils/jwt");
const { models } = require("../db");

exports.requireAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";

    // Extraer token quitando "Bearer "
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({
        code: "AUTH_MISSING",
        message: "No autorizado: Token no proporcionado",
      });
    }

    // 1) Verificar y decodificar JWT
    const payload = verifyAccess(token); // { sub, role, iat, exp, ... }

    if (!payload?.sub) {
      return res.status(401).json({
        code: "AUTH_INVALID",
        message: "Token inválido",
      });
    }

    // 2) Validar usuario en BD (estado actual)
    const user = await models.Usuario.findByPk(payload.sub, {
      attributes: ["id", "estado"],
      include: [{ model: models.Role, attributes: ["nombre"] }],
    });

    if (!user) {
      return res.status(401).json({
        code: "AUTH_INVALID",
        message: "No autorizado: Usuario no existe",
      });
    }

    // ✅ clave: si está inactivo/bloqueado -> matar sesión
    if (user.estado !== "Activo") {
      return res.status(401).json({
        code: "USER_INACTIVE",
        message: "Usuario inactivo o bloqueado",
      });
    }

    // 3) Inyectar usuario en request (y refrescar rol desde BD)
    req.user = {
      ...payload,
      sub: user.id,
      role: user.Role?.nombre || payload.role,
    };

    next();
  } catch (e) {
    const message = e.name === "TokenExpiredError" ? "Token expirado" : "Token inválido";
    return res.status(401).json({ code: "AUTH_INVALID", message });
  }
};
