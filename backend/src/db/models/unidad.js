const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Unidad = sequelize.define('Unidad', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    codigo: { type: DataTypes.STRING(20), allowNull: false, unique: true }, // kg, L, ml, g, und, ha
    nombre: { type: DataTypes.STRING(40), allowNull: false }
  }, {
    tableName: 'unidades',
    timestamps: false
  });
  return Unidad;
};
