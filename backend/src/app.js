const express = require('express');
const path = require('path');
const cors = require('cors'); 
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { config } = require('./config/env');

const app = express();

// --- 1. Seguridad Básica ---
app.set('trust proxy', 1); 

// Helmet con configuración permisiva para desarrollo (imágenes, scripts)
app.use(helmet({
  crossOriginResourcePolicy: false, 
}));

app.use(cookieParser());

// --- 2. CORS (Crucial) ---
const isProduction = config.env === "production";
const allowedOrigins = isProduction
  ? [config.frontendUrl].filter(Boolean)
  : ["http://localhost:5173", "http://127.0.0.1:5173"];

app.use(cors({
  origin: function (origin, callback) {
    // Permitir requests sin origen (como Postman o Server-to-Server)
    if (!origin) return callback(null, true);
    
    if (!isProduction) {
      // En desarrollo, mantener modo permisivo.
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) return callback(null, true);

    console.warn("Bloqueado por CORS:", origin);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-refresh-token'],
  exposedHeaders: ["Content-Disposition"],
}));

// --- 3. Rate Limiting (Suavizado para Dev) ---
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 1000, // 👈 Aumentado para que no te bloquee mientras pruebas
  standardHeaders: true, 
  legacyHeaders: false,
});
app.use(limiter);

// Auth Limiter (login)
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: "TOO_MANY_REQUESTS", message: "Demasiados intentos de login. Intenta de nuevo en 1 minuto." },
});
app.use('/auth/login', authLimiter);
app.use('/api/auth/login', authLimiter);

app.use(express.json());

// ... (Resto de tus rutas igual) ...
// Imports de rutas...
const healthRoutes = require('./modules/health/health.routes');
const authRoutes = require('./modules/auth/auth.routes');
const usuariosRoutes = require('./modules/usuarios/usuarios.routes');
const lotesRoutes = require('./modules/lotes/lotes.routes');
const inventarioRoutes = require('./modules/inventario/inventario.routes');
const tareasRoutes = require('./modules/tareas/tareas.routes');
const pagosRoutes = require('./modules/pagos/pagos.routes');
const reportesRoutes = require('./modules/reportes/reportes.routes');
const notifsRoutes = require('./modules/notificaciones/notificaciones.routes');
const dashboardRoutes = require('./modules/dashboard/dashboard.routes');
const metricasRoutes = require('./modules/metricas/metricas.routes');
const cosechasRoutes = require('./modules/cosechas/cosechas.routes');
const tiposActividadRoutes = require('./modules/tipoActividad/tiposActividad.routes');
const unidadesRouter = require('./modules/inventario/unidades.routes');
const fincasRoutes = require('./modules/fincas/fincas.routes');

// Rutas
app.use('/files', express.static(path.join(__dirname, '../storage')));
app.use('/health', healthRoutes);
app.use('/auth', authRoutes);
app.use('/api/auth', authRoutes);
app.use('/usuarios', usuariosRoutes);
app.use('/fincas', fincasRoutes);
app.use('/lotes', lotesRoutes);
app.use('/inventario', inventarioRoutes);
app.use('/tareas', tareasRoutes);
app.use('/pagos', pagosRoutes);
app.use('/reportes', reportesRoutes);
app.use('/notificaciones', notifsRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/metricas', metricasRoutes);
app.use('/cosechas', cosechasRoutes);
app.use('/tipos-actividad', tiposActividadRoutes);
app.use('/unidades', unidadesRouter);

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'Error interno';
  res.status(status).json({ code, message });
});

module.exports = { app };
