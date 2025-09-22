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

export function isExpired(token, skewMs = 0) {
  const expMs = getExp(token);
  if (!expMs) return false; // si no hay exp, asumimos no caducado (el backend controla)
  return Date.now() + skewMs >= expMs;
}
