const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");

function resolveRequesterKey(req) {
  const userId = req.user?.id ?? req.user?.sub;
  if (userId !== undefined && userId !== null && String(userId).trim() !== "") {
    return `user:${userId}`;
  }
  const ip = req.ip || req.connection?.remoteAddress || "unknown";
  return `ip:${ipKeyGenerator(ip)}`;
}

function rateLimitByUser({
  windowMs,
  max,
  message = { code: "TOO_MANY_REQUESTS", message: "Demasiadas solicitudes. Intenta más tarde." },
}) {
  if (!Number.isFinite(windowMs) || windowMs <= 0) {
    throw new Error("rateLimitByUser: 'windowMs' debe ser un número positivo");
  }
  if (!Number.isFinite(max) || max <= 0) {
    throw new Error("rateLimitByUser: 'max' debe ser un número positivo");
  }

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: resolveRequesterKey,
    message,
  });
}

module.exports = { rateLimitByUser };
