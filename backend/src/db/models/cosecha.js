// backend/src/db/models/cosecha.js
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Cosecha = sequelize.define("Cosecha", {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING(50), allowNull: false }, // "Cosecha 1"
    numero: { type: DataTypes.INTEGER, allowNull: false },    // 1, 2, 3...
    anio_agricola: { type: DataTypes.STRING(20), allowNull: false }, // "2024-2025"
    fecha_inicio: { type: DataTypes.DATEONLY, allowNull: false },
    fecha_fin: { type: DataTypes.DATEONLY, allowNull: false },
    estado: {
      type: DataTypes.ENUM("Activa", "Cerrada"),
      allowNull: false,
      defaultValue: "Activa"
    }
  }, {
    tableName: "cosechas",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  });

  return Cosecha;
};
