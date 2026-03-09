const dotenv = require("dotenv");
const path = require("path");

const env = process.env.NODE_ENV || "development";

function requiredInProduction(name) {
  const value = process.env[name];
  if (env === "production" && (!value || String(value).trim() === "")) {
    throw new Error(`[ENV] Missing required production variable: ${name}`);
  }
  return value;
}

function parsePort(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseDurationToMs(value, fallbackMs) {
  if (!value || typeof value !== "string") return fallbackMs;
  const match = value.trim().match(/^(\d+)(ms|s|m|h|d)$/i);
  if (!match) return fallbackMs;

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const factorByUnit = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return amount * (factorByUnit[unit] || 1);
}

function parsePositiveInt(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const int = Math.trunc(parsed);
  return int > 0 ? int : fallback;
}

if (env !== "production" || process.env.LOAD_DOTENV_IN_PROD === "true") {
  let envFile = ".env.dev";
  if (env === "test") envFile = ".env.test";
  if (env === "production") envFile = ".env.prod";

  dotenv.config({
    path: path.join(process.cwd(), envFile),
    override: true,
  });
}

const config = {
  env,
  port: parsePort(process.env.PORT, 3000),
  frontendUrl: env === "production" ? requiredInProduction("FRONTEND_URL") : process.env.FRONTEND_URL || "http://localhost:5173",
  db: {
    host: env === "production" ? requiredInProduction("DB_HOST") : process.env.DB_HOST || "db",
    port: parsePort(env === "production" ? requiredInProduction("DB_PORT") : process.env.DB_PORT, 5432),
    name: env === "production" ? requiredInProduction("DB_NAME") : process.env.DB_NAME || "finca_dev",
    user: env === "production" ? requiredInProduction("DB_USER") : process.env.DB_USER || "postgres",
    pass: env === "production" ? requiredInProduction("DB_PASS") : process.env.DB_PASS || "postgres",
    logging: String(process.env.DB_LOGGING) === "true",
  },
  jwt: {
    secret: env === "production" ? requiredInProduction("JWT_SECRET") : process.env.JWT_SECRET,
    refreshSecret: env === "production" ? requiredInProduction("JWT_REFRESH_SECRET") : process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES || "15m",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES || "8h",
  },
  session: {
    maxTotalMs: parseDurationToMs(process.env.SESSION_MAX_TOTAL || "8h", 8 * 60 * 60 * 1000),
    inactivityMs: parseDurationToMs(process.env.SESSION_INACTIVITY || "60m", 60 * 60 * 1000),
  },
  notifications: {
    retentionDays: parsePositiveInt(process.env.NOTIFICATIONS_RETENTION_DAYS, 90),
    purgeIntervalMs: parseDurationToMs(process.env.NOTIFICATIONS_PURGE_INTERVAL || "12h", 12 * 60 * 60 * 1000),
  },
};

module.exports = { config };
