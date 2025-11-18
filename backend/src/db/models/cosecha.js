// models/cosecha.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Cosecha = sequelize.define('Cosecha', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING(50), allowNull: false },        // "Cosecha 1"
    numero: { type: DataTypes.INTEGER, allowNull: false },           // 1, 2, 3...
    codigo: { type: DataTypes.STRING(60), allowNull: false, unique: true }, // "FA-CO-1-2025-2026"
    anio_agricola: { type: DataTypes.STRING(20), allowNull: false }, // "2025" o "2025-2026"
    fecha_inicio: { type: DataTypes.DATEONLY, allowNull: false },
    fecha_fin: { type: DataTypes.DATEONLY, allowNull: true },        // 👈 ahora puede ser null
    estado: { 
      type: DataTypes.ENUM('Activa','Cerrada'),
      allowNull: false,
      defaultValue: 'Activa'
    }
  }, {
    tableName: 'cosechas',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Cosecha;
};
