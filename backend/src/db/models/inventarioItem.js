const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const InventarioItem = sequelize.define('InventarioItem', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING(200), allowNull: false, unique: true },
    categoria: { type: DataTypes.ENUM('Insumo','Herramienta','Equipo'), allowNull: false, defaultValue: 'Insumo' },
    unidad_id: { type: DataTypes.BIGINT, allowNull: false }, // unidad base del stock
    stock_actual: { type: DataTypes.DECIMAL(14,3), allowNull: false, defaultValue: '0.000' },
    stock_minimo: { type: DataTypes.DECIMAL(14,3), allowNull: false, defaultValue: '0.000' },
    activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    meta: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} } // ej. periodo_carencia_dias del producto
  }, {
    tableName: 'inventario_items',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  return InventarioItem;
};
