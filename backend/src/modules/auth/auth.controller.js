const service = require('./auth.service');

// Configuración común de cookies para reutilizar
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax', // 'lax' es mejor para dev
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
};

// ✅ LOGIN
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ code:"AUTH_BAD_REQUEST", message:"Email y contraseña son obligatorios" });

    const result = await service.login(email, password);
    res.cookie("refresh_token", result.tokens.refresh, cookieOptions);

    return res.json({ user: result.user, access_token: result.tokens.access });
  } catch (err) {
    // ✅ RESPUESTA JSON CLARA
    const msg = err.message || "Credenciales inválidas";
    const code = msg.includes("inactivo") ? "USER_INACTIVE" : "AUTH_INVALID_CREDENTIALS";
    return res.status(401).json({ code, message: msg });
  }
};


// ✅ REFRESH TOKEN (Corregido)
exports.refresh = async (req, res, next) => {
  try {
    // Buscar token en cookies (prioridad) o body
    const token = req.cookies?.refresh_token || req.body?.refresh_token;

    if (!token) {
      return res.status(401).json({ message: 'Refresh token requerido' });
    }

    const result = await service.refresh(token);

    // 🟢 CORRECCIÓN: Actualizar la cookie con el NUEVO refresh token rotado
    res.cookie('refresh_token', result.tokens.refresh, cookieOptions);

    // Devolver nuevo access token
    res.json({
        user: result.user,
        access_token: result.tokens.access
    });
  } catch (err) {
    // Si falla el refresh (token inválido/expirado), limpiamos la cookie
    res.clearCookie('refresh_token');
    err.status = 401;
    next(err);
  }
};

// ✅ LOGOUT
exports.logout = async (req, res, next) => {
  try {
    res.clearCookie('refresh_token'); 
    res.json({ message: 'Sesión cerrada correctamente' });
  } catch (err) {
    next(err);
  }
};

// ✅ PROFILE
exports.profile = async (req, res, next) => {
  try {
    if (!req.user || !req.user.sub) {
      return res.status(404).json({ message: 'Usuario no identificado' });
    }
    const userProfile = await service.getProfile(req.user.sub);
    res.json(userProfile);
  } catch (err) {
    next(err);
  }
};