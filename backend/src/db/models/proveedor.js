const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Proveedor = sequelize.define(
    "Proveedor",
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      nombre: { type: DataTypes.STRING(200), allowNull: false },
      ruc: { type: DataTypes.STRING(30), allowNull: true, unique: true },
      telefono: { type: DataTypes.STRING(40), allowNull: true },
      correo: { type: DataTypes.STRING(150), allowNull: true },
      direccion: { type: DataTypes.TEXT, allowNull: true },
      activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      tableName: "proveedores",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        { fields: ["nombre"] },
        { fields: ["activo"] },
      ],
    }
  );

  return Proveedor;
};
