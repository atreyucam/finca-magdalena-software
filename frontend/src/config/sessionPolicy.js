const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

function asPositiveInt(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.trunc(parsed);
}

export const SESSION_MAX_TOTAL_MS = asPositiveInt(
  import.meta.env.VITE_SESSION_MAX_TOTAL_MS,
  8 * HOUR_MS
);

export const SESSION_INACTIVITY_MS = asPositiveInt(
  import.meta.env.VITE_SESSION_INACTIVITY_MS,
  60 * MINUTE_MS
);

