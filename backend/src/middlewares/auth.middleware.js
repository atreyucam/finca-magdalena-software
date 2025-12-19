const { verifyAccess } = require('../utils/jwt');

exports.requireAuth = (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    
    // Extraer token quitando "Bearer "
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ 
        code: 'AUTH_MISSING', 
        message: 'No autorizado: Token no proporcionado' 
      });
    }

    // Verificar y decodificar
    const payload = verifyAccess(token);
    
    // Inyectar usuario en la request para los controladores
    req.user = payload; // { sub: 1, role: 'Propietario', ... }
    
    next();
  } catch (e) {
    // Diferenciar token expirado de inválido si es necesario
    const message = e.name === 'TokenExpiredError' ? 'Token expirado' : 'Token inválido';
    return res.status(401).json({ code: 'AUTH_INVALID', message });
  }
};

exports.requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'No autenticado' });
  }

  // Verificar si el rol del token está permitido
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ 
      code: 'AUTH_FORBIDDEN', 
      message: `Acceso denegado. Rol requerido: ${allowedRoles.join(' o ')}` 
    });
  }
  
  next();
};