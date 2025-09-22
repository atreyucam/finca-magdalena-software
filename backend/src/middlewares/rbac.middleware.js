exports.requireRole = (...roles) => (req, res, next) => {
if (!req.user) return res.status(401).json({ message: 'No autorizado' });
if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Prohibido' });
next();
};