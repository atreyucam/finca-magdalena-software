const express = require('express');
const path = require('path');
const cors = require('cors'); 
const { config } = require('./config/env');

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

const app = express();
app.use(cors({
  origin: "http://localhost:5173", // origen del frontend
  credentials: true,               // si luego usas cookies/sesión
}));
app.use(express.json());


// Rutas
app.use('/files', express.static(path.join(__dirname, '../storage')));
app.use('/health', healthRoutes);
app.use('/auth', authRoutes);
app.use('/usuarios', usuariosRoutes);
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

// Manejo básico de errores
app.use((err, req, res, next) => {
console.error(err);
const status = err.status || 500;
const code = err.code || 'INTERNAL_ERROR';
const message = err.message || 'Error interno';
res.status(status).json({ code, message });
});


module.exports = { app };