const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const CompraDetalle = sequelize.define(
    "CompraDetalle",
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      compra_id: { type: DataTypes.BIGINT, allowNull: false },
      inventario_item_id: { type: DataTypes.BIGINT, allowNull: false },
      cantidad: { type: DataTypes.DECIMAL(14, 3), allowNull: false },
      costo_unitario: { type: DataTypes.DECIMAL(14, 4), allowNull: false },
      subtotal: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
    },
    {
      tableName: "compra_detalles",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        { fields: ["compra_id"] },
        { fields: ["inventario_item_id"] },
        { unique: true, fields: ["compra_id", "inventario_item_id"] },
      ],
    }
  );

  return CompraDetalle;
};
