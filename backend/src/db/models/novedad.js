const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Novedad = sequelize.define('Novedad', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    tarea_id: { type: DataTypes.BIGINT, allowNull: false },
    autor_id: { type: DataTypes.BIGINT, allowNull: false },
    texto: { type: DataTypes.TEXT, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'novedades',
    timestamps: false,
    indexes: [{ fields: ['tarea_id'] }]
  });
  return Novedad;
};
