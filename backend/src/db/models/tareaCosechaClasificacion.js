// backend/src/models/tareaCosechaClasificacion.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TareaCosechaClasificacion = sequelize.define('TareaCosechaClasificacion', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },

    // 👈 YA NO lote_cosecha_id
    tarea_cosecha_id: { type: DataTypes.BIGINT, allowNull: false },

    destino: { type: DataTypes.ENUM('Exportacion', 'Nacional'), allowNull: true }, // opcional
    gabetas: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    peso_promedio_gabeta_kg: { type: DataTypes.DECIMAL(8, 3) }, // opcional
    kg: {
  type: DataTypes.DECIMAL(12, 3),
  allowNull: false,
  defaultValue: 0
},

  }, {
    tableName: 'tarea_cosecha_clasificacion',
    timestamps: false,
    indexes: [{ fields: ['tarea_cosecha_id', 'destino'] }],
  });

  return TareaCosechaClasificacion;
};
