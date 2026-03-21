const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Cliente = sequelize.define(
    "Cliente",
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      nombre: { type: DataTypes.STRING(200), allowNull: false },
      identificacion: { type: DataTypes.STRING(30), allowNull: true, unique: true },
      telefono: { type: DataTypes.STRING(40), allowNull: true },
      correo: { type: DataTypes.STRING(150), allowNull: true },
      direccion: { type: DataTypes.TEXT, allowNull: true },
      activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      tableName: "clientes",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [{ fields: ["nombre"] }, { fields: ["activo"] }],
    }
  );

  return Cliente;
};
