const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TipoActividad = sequelize.define('TipoActividad', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    codigo: { type: DataTypes.STRING(40), unique: true, allowNull: false }, // ej. PODA, MALEZA, NUTR, FITO, ENFUND, COSECHA
    nombre: { type: DataTypes.STRING(80), allowNull: false }
  }, {
    tableName: 'tipos_actividad',
    timestamps: false
  });
  return TipoActividad;
};
