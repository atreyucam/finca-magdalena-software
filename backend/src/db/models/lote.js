const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Lote = sequelize.define('Lote', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false }, // Quitamos unique global
finca_id: { 
  type: DataTypes.BIGINT, 
  allowNull: false,
  references: { model: 'fincas', key: 'id' } 
},
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
