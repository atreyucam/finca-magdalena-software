// Decodificador ligero (sin dependencias) para leer "exp" del access token
export function decodeJwt(token) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload;
  } catch {
    return null;
  }
}

export function getExp(token) {
  const payload = decodeJwt(token);
  return payload?.exp ? payload.exp * 1000 : null; // ms
}

export function getSessionClaims(token) {
  const payload = decodeJwt(token);
  if (!payload) return null;

  const iatMs = Number(payload.iat) * 1000;
  const sessionStartAt = Number.isFinite(Number(payload.session_start_at))
    ? Number(payload.session_start_at)
    : iatMs;
  const lastActivityAt = Number.isFinite(Number(payload.last_activity_at))
    ? Number(payload.last_activity_at)
    : sessionStartAt;

  return {
    sid: payload.sid || null,
    sessionStartAt: Number.isFinite(sessionStartAt) ? sessionStartAt : null,
    lastActivityAt: Number.isFinite(lastActivityAt) ? lastActivityAt : null,
  };
}

export function isExpired(token, skewMs = 0) {
  const expMs = getExp(token);
  if (!expMs) return false; // si no hay exp, asumimos no caducado (el backend controla)
  return Date.now() + skewMs >= expMs;
}
