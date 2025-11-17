// src/db/models.js
const db = require('./index');

// Exponemos sequelize + modelos planos
module.exports = {
  sequelize: db.sequelize,
  ...db.models,
};
