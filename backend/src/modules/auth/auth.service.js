const { models } = require('../../db');
const { comparePassword } = require('../../utils/crypto');
const { signAccessToken, signRefreshToken, verifyRefresh  } = require('../../utils/jwt');


exports.login = async (email, password) => {
const user = await models.Usuario.findOne({ where: { email }, include: [{ model: models.Role }] });
if (!user || user.estado !== 'Activo') throw new Error('Credenciales inválidas');
const ok = await comparePassword(password, user.password_hash);
if (!ok) throw new Error('Credenciales inválidas');


const payload = { sub: user.id, role: user.Role?.nombre || 'Trabajador' };
const access = signAccessToken(payload);
const refresh = signRefreshToken(payload);
return {
user: {
id: user.id,
nombres: user.nombres,
apellidos: user.apellidos,
email: user.email,
role: user.Role?.nombre
},
tokens: { access, refresh }
};
};

exports.login = async (email, password) => {
  const user = await models.Usuario.findOne({ where: { email }, include: [{ model: models.Role }] });
  if (!user || user.estado !== 'Activo') throw new Error('Credenciales inválidas');
  const ok = await comparePassword(password, user.password_hash);
  if (!ok) throw new Error('Credenciales inválidas');

  const payload = { sub: user.id, role: user.Role?.nombre || 'Trabajador' };
  const access = signAccessToken(payload);
  const refresh = signRefreshToken(payload);
  return {
    user: {
      id: user.id,
      nombres: user.nombres,
      apellidos: user.apellidos,
      email: user.email,
      role: user.Role?.nombre
    },
    tokens: { access, refresh }
  };
};

exports.refresh = async (refreshToken) => {
  // 1) validar refresh
  const payload = verifyRefresh(refreshToken); // { sub, role, iat, exp }

  // 2) comprobar que el usuario sigue activo
  const user = await models.Usuario.findByPk(payload.sub, { include: [{ model: models.Role }] });
  if (!user || user.estado !== 'Activo') throw new Error('Usuario inválido o inactivo');

  // 3) emitir tokens nuevos (rotación)
  const newPayload = { sub: user.id, role: user.Role?.nombre || payload.role };
  const access = signAccessToken(newPayload);
  const refresh = signRefreshToken(newPayload);

  return {
    user: {
      id: user.id,
      nombres: user.nombres,
      apellidos: user.apellidos,
      email: user.email,
      role: user.Role?.nombre
    },
    tokens: { access, refresh }
  };
};
