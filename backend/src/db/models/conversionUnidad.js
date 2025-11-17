const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ConversionUnidad = sequelize.define('ConversionUnidad', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    from_unidad_id: { type: DataTypes.BIGINT, allowNull: false },
    to_unidad_id: { type: DataTypes.BIGINT, allowNull: false },
    factor: { type: DataTypes.DECIMAL(18,6), allowNull: false }
  }, {
    tableName: 'conversiones_unidad',
    timestamps: false,
    indexes: [{ unique: true, fields: ['from_unidad_id','to_unidad_id'] }]
  });
  return ConversionUnidad;
};
