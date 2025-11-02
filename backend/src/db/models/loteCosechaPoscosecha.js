// backend/src/db/models/loteCosechaPoscosecha.js
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const LoteCosechaPoscosecha = sequelize.define('LoteCosechaPoscosecha', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    lote_cosecha_id: { type: DataTypes.BIGINT, allowNull: false, unique: true },
    cepillado: { type: DataTypes.BOOLEAN, defaultValue: false },
    clasificacion: { type: DataTypes.BOOLEAN, defaultValue: false },
    tipo_contenedor: { type: DataTypes.STRING(40) },       // “Gabeta plástica”
    capacidad_gabeta_kg: { type: DataTypes.DECIMAL(8,3) }, // ej. 4.5 o 5.0
    gabetas_llenas: { type: DataTypes.INTEGER }            // exp + nac (vista rápida)
  }, {
    tableName: 'lote_cosecha_poscosecha',
    timestamps: false
  });
  return LoteCosechaPoscosecha;
};
