// src/db/models/cosecha.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Cosecha = sequelize.define('Cosecha', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    finca_id: { // 🔹 AGREGAR ESTO
      type: DataTypes.BIGINT, 
      allowNull: false,
      references: { model: 'fincas', key: 'id' } 
    },
    nombre: { type: DataTypes.STRING(50), allowNull: false },
    numero: { type: DataTypes.INTEGER, allowNull: false },
    codigo: { type: DataTypes.STRING(60), allowNull: false, unique: true },
    anio_agricola: { type: DataTypes.STRING(20), allowNull: false },
    fecha_inicio: { type: DataTypes.DATEONLY, allowNull: false },
    fecha_fin: { type: DataTypes.DATEONLY, allowNull: true },
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