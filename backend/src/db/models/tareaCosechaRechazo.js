// backend/src/models/tareaCosechaRechazo.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TareaCosechaRechazo = sequelize.define('TareaCosechaRechazo', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },

    // 👈 YA NO lote_cosecha_id
    tarea_cosecha_id: { type: DataTypes.BIGINT, allowNull: false },

    causa: { 
      type: DataTypes.ENUM('DanoMecanico', 'Plaga', 'Calibre', 'Manipulacion', 'Otro'),
      allowNull: false 
    },
    kg: { type: DataTypes.DECIMAL(12, 3), allowNull: false, defaultValue: '0.000' },
    observacion: { type: DataTypes.TEXT },
  }, {
    tableName: 'tarea_cosecha_rechazos',
    timestamps: false,
    indexes: [{ fields: ['tarea_cosecha_id', 'causa'] }],
  });

  return TareaCosechaRechazo;
};
