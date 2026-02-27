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
  return allowedOrigins.includes(target);
}

module.exports = {
  buildAllowedOrigins,
  isOriginAllowed,
};

