// backend/src/modules/tareas/__tests__/__mocks__/auth.middleware.js
module.exports = {
  requireAuth: (req, _res, next) => {
    // inyecta un usuario por defecto
    req.user = { sub: 1, role: 'Tecnico' };
    next();
  }
};
