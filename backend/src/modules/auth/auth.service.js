const { models } = require('../../db');
const { comparePassword } = require('../../utils/crypto');
const { signAccessToken, signRefreshToken, verifyRefresh } = require('../../utils/jwt');

// Helper para formatear la respuesta del usuario de forma consistente
const formatUserResponse = (user) => ({
  id: user.id,
  nombres: user.nombres,
  apellidos: user.apellidos,
  email: user.email,
  estado: user.estado,
  role_id: user.role_id,
  role: user.Role?.nombre || 'Sin Rol',
  Role: user.Role // Para compatibilidad si el front usa user.Role.nombre
});

/**
 * Lógica de Login
 */
exports.login = async (email, password) => {
  // 1. Buscar usuario activo incluyendo su Rol
  const user = await models.Usuario.findOne({ 
    where: { email }, 
    include: [{ model: models.Role }] 
  });

  // 2. Validaciones de existencia y estado
  if (!user) throw new Error('Credenciales inválidas');
  if (user.estado !== 'Activo') throw new Error('Usuario inactivo o bloqueado');

  // 3. Validar contraseña
  const ok = await comparePassword(password, user.password_hash);
  if (!ok) throw new Error('Credenciales inválidas');

  // 4. Generar tokens
  const payload = { sub: user.id, role: user.Role?.nombre };
  const access = signAccessToken(payload);
  const refresh = signRefreshToken(payload);

  return {
    user: formatUserResponse(user),
    tokens: { access, refresh }
  };
};

/**
 * Lógica de Refresh
 */
exports.refresh = async (token) => {
  // 1. Verificar firma del refresh token
  const payload = verifyRefresh(token); // Lanza error si expiró o es inválido

  // 2. Verificar que el usuario siga existiendo y esté activo en BD
  const user = await models.Usuario.findByPk(payload.sub, { 
    include: [{ model: models.Role }] 
  });

  if (!user || user.estado !== 'Activo') {
    throw new Error('Usuario inválido o inactivo durante refresh');
  }

  // 3. Rotación de tokens (emitir nuevos)
  const newPayload = { sub: user.id, role: user.Role?.nombre };
  const access = signAccessToken(newPayload);
  const refresh = signRefreshToken(newPayload);

  return {
    user: formatUserResponse(user),
    tokens: { access, refresh }
  };
};

/**
 * Lógica de Perfil
 */
exports.getProfile = async (userId) => {
  const user = await models.Usuario.findByPk(userId, {
    attributes: { exclude: ['password_hash'] }, // Nunca devolver el hash
    include: [{ model: models.Role }]
  });

  if (!user) throw new Error('Usuario no encontrado');

  return formatUserResponse(user);
};