const DEV_DEFAULT_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

function normalizeOrigin(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function parseOrigins(value) {
  return String(value || "")
    .split(",")
    .map((item) => normalizeOrigin(item))
    .filter(Boolean);
}

function uniq(items = []) {
  return [...new Set(items.map((item) => normalizeOrigin(item)).filter(Boolean))];
}

function buildAllowedOrigins(env, frontendUrl) {
  const envOrigins = parseOrigins(frontendUrl);
  if (env === "production") {
    return uniq(envOrigins);
  }
  return uniq([...DEV_DEFAULT_ORIGINS, ...envOrigins]);
}

function isOriginAllowed(origin, allowedOrigins = []) {
  const target = normalizeOrigin(origin);
  if (!target) return true;
  if (allowedOrigins.includes(target)) return true;

  // En desarrollo/testing permitimos localhost/127.0.0.1 en cualquier puerto.
  // Evita errores CORS al alternar Vite (5173) o previews locales (4173, etc).
  if (process.env.NODE_ENV !== "production") {
    try {
      const parsed = new URL(target);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
          return true;
        }
      }
    } catch {
      // ignore invalid origin format
    }
  }

  return false;
}

module.exports = {
  buildAllowedOrigins,
  isOriginAllowed,
};

