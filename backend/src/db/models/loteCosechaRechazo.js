// backend/src/db/models/loteCosechaRechazo.js
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const LoteCosechaRechazo = sequelize.define('LoteCosechaRechazo', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    lote_cosecha_id: { type: DataTypes.BIGINT, allowNull: false },
    causa: { type: DataTypes.ENUM('DanoMecanico','Plaga','Calibre','Manipulacion','Otro'), allowNull: false },
    kg: { type: DataTypes.DECIMAL(12,3), allowNull: false, defaultValue: '0.000' },
    observacion: { type: DataTypes.TEXT }
  }, {
    tableName: 'lote_cosecha_rechazos',
    timestamps: false,
    indexes: [{ fields: ['lote_cosecha_id','causa'] }]
  });
  return LoteCosechaRechazo;
};