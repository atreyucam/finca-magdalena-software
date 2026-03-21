const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const VentaDetalle = sequelize.define(
    "VentaDetalle",
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      venta_id: { type: DataTypes.BIGINT, allowNull: false },
      clase: { type: DataTypes.STRING(30), allowNull: false },
      peso_kg: { type: DataTypes.DECIMAL(14, 3), allowNull: false },
      precio_unitario: { type: DataTypes.DECIMAL(14, 4), allowNull: false },
      subtotal: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
    },
    {
      tableName: "venta_detalles",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        { fields: ["venta_id"] },
        { unique: true, fields: ["venta_id", "clase"] },
      ],
    }
  );

  return VentaDetalle;
};
