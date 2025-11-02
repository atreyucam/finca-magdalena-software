// backend/src/modules/tareas/__tests__/__mocks__/rbac.middleware.js
module.exports = {
  requireRole: (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Prohibido' });
    }
    next();
  }
};
