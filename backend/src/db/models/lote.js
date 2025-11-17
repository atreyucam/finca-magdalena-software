const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Lote = sequelize.define('Lote', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING(100), unique: true, allowNull: false },
    superficie_ha: { type: DataTypes.DECIMAL(5,2), allowNull: false, defaultValue: 0 },
    numero_plantas: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    fecha_siembra: { type: DataTypes.DATEONLY },
    estado: { type: DataTypes.ENUM('Activo','Inactivo'), defaultValue: 'Activo' }
  }, {
    tableName: 'lotes',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  return Lote;
};
