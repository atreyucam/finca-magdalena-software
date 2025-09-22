const { verifyAccess } = require('../utils/jwt');


exports.requireAuth = (req, res, next) => {
try {
const header = req.headers.authorization || '';
const token = header.startsWith('Bearer ') ? header.slice(7) : null;
if (!token) return res.status(401).json({ message: 'No autorizado' });
const payload = verifyAccess(token);
req.user = payload; // { sub, role }
next();
} catch (e) {
return res.status(401).json({ message: 'Token inválido' });
}
};