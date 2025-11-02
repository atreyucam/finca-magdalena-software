const { Router } = require('express');
const controller = require('./usuarios.controller');
const { requireAuth } = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/rbac.middleware');


const router = Router();

/* ========= NUEVO: endpoints “me” ========= */
router.get('/me', requireAuth, controller.obtenerMiUsuario);
router.get('/me/pagos', requireAuth, controller.obtenerMisPagos);
router.get('/me/tareas', requireAuth, controller.obtenerMisTareas);
/* ======================================== */


// Solo Propietario y Tecnico pueden gestionar usuarios
router.post('/', requireAuth, requireRole('Propietario','Tecnico'), controller.crearUsuario);
router.get('/', requireAuth, requireRole('Propietario','Tecnico'), controller.listarUsuarios);
router.get('/:id', requireAuth, requireRole('Propietario','Tecnico'), controller.obtenerUsuario);
router.patch('/:id', requireAuth, requireRole('Propietario','Tecnico'), controller.editarUsuario);
router.patch('/:id/desactivar', requireAuth, requireRole('Propietario','Tecnico'), controller.desactivarUsuario);

router.get('/estadisticas', requireAuth, requireRole('Propietario','Tecnico'), controller.obtenerEstadisticas);
router.get('/:id/pagos', requireAuth, requireRole('Propietario','Tecnico'), controller.obtenerPagosUsuario);
router.get('/:id/tareas', requireAuth, requireRole('Propietario','Tecnico'), controller.obtenerTareasUsuario);



module.exports = router;