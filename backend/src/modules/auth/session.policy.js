const { randomUUID } = require("crypto");
const { config } = require("../../config/env");

const SESSION_ERRORS = {
  INVALID: {
    code: "AUTH_SESSION_INVALID",
    message: "La sesión es inválida. Inicia sesión nuevamente.",
  },
  MAX: {
    code: "AUTH_SESSION_EXPIRED_MAX",
    message: "La sesión alcanzó el máximo permitido de 8 horas. Vuelve a iniciar sesión.",
  },
  INACTIVITY: {
    code: "AUTH_SESSION_EXPIRED_INACTIVITY",
    message: "La sesión expiró por 60 minutos de inactividad. Vuelve a iniciar sesión.",
  },
};

function unauthorizedSession(errorConfig) {
  const error = new Error(errorConfig.message);
  error.status = 401;
  error.code = errorConfig.code;
  return error;
}

function toTimestampMs(value, fallback = null) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return fallback;
  return Math.trunc(number);
}

function sanitizeActivityHint(activityHint, now) {
  const candidate = toTimestampMs(activityHint, null);
  if (!candidate) return null;

  // Evita aceptar valores demasiado a futuro.
  if (candidate > now + 30_000) return null;

  return candidate;
}

function assertSessionWithinBounds({ sessionStartAt, lastActivityAt, now = Date.now() }) {
  if (!Number.isFinite(sessionStartAt) || !Number.isFinite(lastActivityAt)) {
    throw unauthorizedSession(SESSION_ERRORS.INVALID);
  }

  if (now - sessionStartAt > config.session.maxTotalMs) {
    throw unauthorizedSession(SESSION_ERRORS.MAX);
  }

  if (now - lastActivityAt > config.session.inactivityMs) {
    throw unauthorizedSession(SESSION_ERRORS.INACTIVITY);
  }
}

function buildNewSession(now = Date.now()) {
  return {
    sid: randomUUID(),
    sessionStartAt: now,
    lastActivityAt: now,
  };
}

function resolveSessionFromRefreshPayload(refreshPayload = {}, activityHint, now = Date.now()) {
  const iatMs = toTimestampMs(refreshPayload.iat, null)
    ? Number(refreshPayload.iat) * 1000
    : null;
  const sessionStartAt = toTimestampMs(refreshPayload.session_start_at, iatMs || now);
  const tokenLastActivity = toTimestampMs(
    refreshPayload.last_activity_at,
    sessionStartAt
  );
  const hint = sanitizeActivityHint(activityHint, now);
  const lastActivityAt = hint ? Math.max(tokenLastActivity, hint) : tokenLastActivity;

  assertSessionWithinBounds({ sessionStartAt, lastActivityAt, now });

  return {
    sid: String(refreshPayload.sid || randomUUID()),
    sessionStartAt,
    lastActivityAt,
  };
}

function toTokenClaims(session) {
  return {
    sid: session.sid,
    session_start_at: session.sessionStartAt,
    last_activity_at: session.lastActivityAt,
  };
}

module.exports = {
  SESSION_ERRORS,
  assertSessionWithinBounds,
  buildNewSession,
  resolveSessionFromRefreshPayload,
  toTokenClaims,
};
