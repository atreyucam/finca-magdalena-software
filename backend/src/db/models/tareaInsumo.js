// backend/src/db/models/tareaInsumo.js
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
const TareaInsumo = sequelize.define('TareaInsumo', {
id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
tarea_id: { type: DataTypes.BIGINT, allowNull: false },
item_id: { type: DataTypes.BIGINT, allowNull: false },
unidad_id: { type: DataTypes.BIGINT, allowNull: false }, // puede diferir de la unidad base del item
cantidad: { type: DataTypes.DECIMAL(14,3), allowNull: false },
}, { tableName: 'tarea_insumos', timestamps: false, indexes: [{ fields: ['tarea_id'] }] });
return TareaInsumo;
};