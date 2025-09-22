// backend/src/db/models/inventarioMovimiento.js
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
const InventarioMovimiento = sequelize.define('InventarioMovimiento', {
id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
item_id: { type: DataTypes.BIGINT, allowNull: false },
tipo: { type: DataTypes.ENUM('ENTRADA','SALIDA','AJUSTE_ENTRADA','AJUSTE_SALIDA','PRESTAMO_SALIDA','PRESTAMO_DEVUELTA','BAJA'), allowNull: false },
cantidad: { type: DataTypes.DECIMAL(14,3), allowNull: false }, // en unidad declarada
unidad_id: { type: DataTypes.BIGINT, allowNull: false },
factor_a_unidad_base: { type: DataTypes.DECIMAL(20,8), allowNull: false },
cantidad_en_base: { type: DataTypes.DECIMAL(14,3), allowNull: false },
stock_resultante: { type: DataTypes.DECIMAL(14,3), allowNull: false },
fecha: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
motivo: { type: DataTypes.TEXT },
referencia: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} }
}, { tableName: 'inventario_movimientos', timestamps: false, indexes: [{ fields: ['item_id','fecha'] }] });
return InventarioMovimiento;
};