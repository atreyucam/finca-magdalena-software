// backend/src/modules/tareas/tareas.routes.js
const { Router } = require('express');
const controller = require('./tareas.controller');
const { requireAuth } = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/rbac.middleware');
const { rateLimitByUser } = require('../../middlewares/rateLimitByUser.middleware');

const router = Router();
const estadosTareaLimiter = rateLimitByUser({
  windowMs: 60 * 1000,
  max: 30,
  message: { code: "TOO_MANY_REQUESTS", message: "Demasiados cambios de estado de tarea. Intenta de nuevo en 1 minuto." },
});
const novedadesLimiter = rateLimitByUser({
  windowMs: 60 * 1000,
  max: 30,
  message: { code: "TOO_MANY_REQUESTS", message: "Demasiadas novedades enviadas. Intenta de nuevo en 1 minuto." },
});

// 1. Consultas Generales
router.get('/resumen', requireAuth, controller.resumenTareas);
router.get('/', requireAuth, controller.listarTareas);
router.get('/:id', requireAuth, controller.obtenerTarea);

// 2. Gestión Principal (Solo Propietario/Técnico)
router.post('/', requireAuth, requireRole('Propietario','Tecnico'), controller.crearTarea);
router.post("/:id/cancelar", requireAuth, estadosTareaLimiter, requireRole('Propietario','Tecnico'), controller.cancelarTarea);

// 3. Flujo de Estados
// Iniciar: Puede hacerlo el trabajador asignado
router.post("/:id/iniciar", requireAuth, estadosTareaLimiter, controller.iniciarTarea);
// Completar: Puede hacerlo el trabajador asignado (registra datos reales)
router.post('/:id/completar', requireAuth, estadosTareaLimiter, controller.completarTarea);
// Verificar: Solo técnico/propietario (Descuenta stock)
router.post('/:id/verificar', requireAuth, estadosTareaLimiter, requireRole('Propietario','Tecnico'), controller.verificarTarea);
router.patch('/:id/detalles', requireAuth, requireRole('Propietario','Tecnico'), controller.actualizarDetalles);
// 4. Gestión de Recursos (Asignaciones e Ítems)
// ✅ Endpoint único oficial
router.patch('/:id/asignaciones', requireAuth, requireRole('Propietario','Tecnico'), controller.actualizarAsignaciones);

// (Opcional) compatibilidad con frontend viejo
router.post('/:id/asignaciones', requireAuth, requireRole('Propietario','Tecnico'), controller.actualizarAsignaciones);

router.post('/:id/items', requireAuth, requireRole('Propietario','Tecnico'), controller.configurarItems);
router.get('/:id/items', requireAuth, controller.listarItems);

// 5. Novedades (Bitácora)
router.post('/:id/novedades', requireAuth, novedadesLimiter, controller.crearNovedad);
router.get('/:id/novedades', requireAuth, controller.listarNovedades);

module.exports = router;
