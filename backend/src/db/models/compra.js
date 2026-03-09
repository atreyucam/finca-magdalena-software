const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Compra = sequelize.define(
    "Compra",
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      numero_factura: { type: DataTypes.STRING(80), allowNull: false, unique: true },
      proveedor_id: { type: DataTypes.BIGINT, allowNull: false },
      fecha_compra: { type: DataTypes.DATEONLY, allowNull: false },
      observacion: { type: DataTypes.TEXT, allowNull: true },
      subtotal: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: "0.00" },
      total: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: "0.00" },
      estado: {
        type: DataTypes.ENUM("CONFIRMADA"),
        allowNull: false,
        defaultValue: "CONFIRMADA",
      },
      creado_por: { type: DataTypes.BIGINT, allowNull: false },
    },
    {
      tableName: "compras",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        { unique: true, fields: ["numero_factura"] },
        { fields: ["proveedor_id"] },
        { fields: ["fecha_compra"] },
        { fields: ["creado_por"] },
      ],
    }
  );

  return Compra;
};
