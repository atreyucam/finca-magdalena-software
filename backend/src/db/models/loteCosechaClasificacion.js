const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LoteCosechaClasificacion = sequelize.define('LoteCosechaClasificacion', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    lote_cosecha_id: { type: DataTypes.BIGINT, allowNull: false },
    destino: { type: DataTypes.ENUM('Exportacion','Nacional'), allowNull: true }, // opcional
    gabetas: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    peso_promedio_gabeta_kg: { type: DataTypes.DECIMAL(8,3) }, // opcional
    kg_estimados: { type: DataTypes.DECIMAL(12,3) }            // opcional
  }, {
    tableName: 'lote_cosecha_clasificacion',
    timestamps: false,
    indexes: [{ fields: ['lote_cosecha_id','destino'] }]
  });
  return LoteCosechaClasificacion;
};
