const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Usuario = sequelize.define('Usuario', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    cedula: { type: DataTypes.STRING(20), unique: true, allowNull: false },
    nombres: { type: DataTypes.STRING(100), allowNull: false },
    apellidos: { type: DataTypes.STRING(100), allowNull: false },
    
    // CAMBIO 1: Email ahora permite NULL (para esporádicos)
    email: { type: DataTypes.STRING(150), unique: true, allowNull: true }, 
    
    telefono: { type: DataTypes.STRING(30) },
    direccion: { type: DataTypes.TEXT },
    fecha_ingreso: { type: DataTypes.DATEONLY },
    estado: { type: DataTypes.ENUM('Activo','Inactivo','Bloqueado'), defaultValue: 'Activo' },
    
    // CAMBIO 2: Password ahora permite NULL
    password_hash: { type: DataTypes.TEXT, allowNull: true }, 
    
    role_id: { type: DataTypes.BIGINT, allowNull: false },

    // ✅ NUEVO: usuario protegido (no editable/desactivable por otros)
    protegido: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },


    // CAMBIO 3: Nuevo campo discriminador
    tipo: { 
      type: DataTypes.ENUM('Fijo', 'Esporadico'), 
      defaultValue: 'Fijo',
      allowNull: false 
    }

  }, {
    tableName: 'usuarios',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  return Usuario;
};