const service = require('./auth.service');


exports.login = async (req, res, next) => {
try {
const { email, password } = req.body;
const result = await service.login(email, password);
res.json(result);
} catch (err) {
err.status = 401;
next(err);
}
};

exports.refresh = async (req, res, next) => {
  try {
    const token =
      req.body?.refresh ||
      req.headers['x-refresh-token'] ||
      req.cookies?.refresh_token;

    if (!token) return res.status(401).json({ message: 'Refresh token requerido' });

    const result = await service.refresh(token);

    // opcional: setear cookie httpOnly además del JSON
    // res.cookie('refresh_token', result.tokens.refresh, {
    //   httpOnly: true, sameSite: 'lax', secure: false, path: '/auth/refresh', maxAge: 7*24*60*60*1000
    // });

    res.json(result);
  } catch (err) {
    err.status = 401;
    next(err);
  }
};