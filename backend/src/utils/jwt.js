const jwt = require('jsonwebtoken');
const { config } = require('../config/env');


exports.signAccessToken = (payload) =>
jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.accessExpiresIn });


exports.signRefreshToken = (payload) =>
jwt.sign(payload, config.jwt.refreshSecret, { expiresIn: config.jwt.refreshExpiresIn });


exports.verifyAccess = (token) => jwt.verify(token, config.jwt.secret);
exports.verifyRefresh = (token) => jwt.verify(token, config.jwt.refreshSecret);