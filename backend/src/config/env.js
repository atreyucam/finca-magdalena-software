// src/config/env.js
const dotenv = require('dotenv');
const path = require('path');

let envFile = '.env.dev';

if (process.env.NODE_ENV === 'production') {
  envFile = '.env.prod';
} else if (process.env.NODE_ENV === 'test') {
  envFile = '.env.test';
}

// 👇 CLAVE: permitir que el .env actual sobrescriba variables previas
dotenv.config({
  path: path.join(process.cwd(), envFile),
  override: true,
});

const config = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  db: {
    host: process.env.DB_HOST || 'db',          // dentro de Docker el host del postgres es "db"
    port: +process.env.DB_PORT || 5432,
    name: process.env.DB_NAME || 'finca_dev',   // ahora sí respetará lo de .env.test
    user: process.env.DB_USER || 'postgres',
    pass: process.env.DB_PASS || 'postgres',
    logging: String(process.env.DB_LOGGING) === 'true',
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES || '7d',
  },
};

module.exports = { config };
