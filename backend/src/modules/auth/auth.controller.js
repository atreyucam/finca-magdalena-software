const service = require('./auth.service');
const { config } = require('../../config/env');

function toMilliseconds(duration, fallbackMs) {
  if (!duration || typeof duration !== 'string') return fallbackMs;

  const match = duration.trim().match(/^(\d+)(ms|s|m|h|d)$/i);
  if (!match) return fallbackMs;

  const value = Number(match[1]);
  const unit = match[2].toLowerCase();

  const unitToMs = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return value * (unitToMs[unit] || 1);
}

const refreshCookiePath = config.env === 'production' ? '/api/auth/refresh' : '/auth/refresh';
const refreshCookieMaxAge = toMilliseconds(config.jwt.refreshExpiresIn, 7 * 24 * 60 * 60 * 1000);

function getRefreshCookieOptions() {
  return {
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: 'lax',
    path: refreshCookiePath,
    maxAge: refreshCookieMaxAge,
  };
}

function clearRefreshCookie(res) {
  res.clearCookie('refresh_token', {
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: 'lax',
    path: refreshCookiePath,
  });
}

// ✅ LOGIN
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ code:"AUTH_BAD_REQUEST", message:"Email y contraseña son obligatorios" });

    const result = await service.login(email, password);
    res.cookie('refresh_token', result.tokens.refresh, getRefreshCookieOptions());

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
    // Refresh token solo por cookie httpOnly (nunca por body)
    const token = req.cookies?.refresh_token;

    if (!token) {
      return res.status(401).json({ code: 'AUTH_REFRESH_REQUIRED', message: 'Refresh token requerido' });
    }

    const result = await service.refresh(token);

    // Rotación de refresh token + sobreescritura de cookie
    res.cookie('refresh_token', result.tokens.refresh, getRefreshCookieOptions());

    res.json({
      user: result.user,
      access_token: result.tokens.access
    });
  } catch (err) {
    // Si falla refresh (inválido/expirado), limpiar cookie y devolver 401
    clearRefreshCookie(res);
    err.status = 401;
    next(err);
  }
};

// ✅ LOGOUT
exports.logout = async (req, res, next) => {
  try {
    clearRefreshCookie(res);
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
