// backend/src/db/models/periodoCosecha.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PeriodoCosecha = sequelize.define('PeriodoCosecha', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    cosecha_id: { type: DataTypes.BIGINT, allowNull: false },
    nombre: {
      type: DataTypes.ENUM(
        'Pre-Floración',
        'Floración',
        'Crecimiento',
        'Cosecha/Recuperación'
      ),
      allowNull: false,
    },
  }, {
    tableName: 'periodos_cosecha',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['cosecha_id', 'nombre'], // 1 solo periodo de cada tipo por cosecha
      },
    ],
  });

  return PeriodoCosecha;
};
