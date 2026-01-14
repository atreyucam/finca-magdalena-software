const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Finca = sequelize.define('Finca', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING(100), unique: true, allowNull: false },
    hectareas_totales: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    ubicacion: { type: DataTypes.STRING(255), allowNull: true },
    estado: { type: DataTypes.ENUM('Activo', 'Inactivo'), defaultValue: 'Activo' }
  }, {
    tableName: 'fincas',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  return Finca;
};