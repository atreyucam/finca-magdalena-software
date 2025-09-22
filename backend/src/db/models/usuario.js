const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
const Usuario = sequelize.define('Usuario', {
id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
cedula: { type: DataTypes.STRING(20), unique: true, allowNull: false },
nombres: { type: DataTypes.STRING(100), allowNull: false },
apellidos: { type: DataTypes.STRING(100), allowNull: false },
email: { type: DataTypes.STRING(150), unique: true, allowNull: false },
telefono: { type: DataTypes.STRING(30) },
direccion: { type: DataTypes.TEXT },
fecha_ingreso: { type: DataTypes.DATEONLY },
estado: { type: DataTypes.ENUM('Activo','Inactivo','Bloqueado'), defaultValue: 'Activo' },
password_hash: { type: DataTypes.TEXT, allowNull: false },
role_id: { type: DataTypes.BIGINT, allowNull: false }
}, {
tableName: 'usuarios',
timestamps: true,
createdAt: 'created_at',
updatedAt: 'updated_at'
});
return Usuario;
};