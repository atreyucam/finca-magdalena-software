const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
const Role = sequelize.define('Role', {
id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
nombre: { type: DataTypes.STRING(40), unique: true, allowNull: false } // Propietario|Tecnico|Trabajador
}, { tableName: 'roles', timestamps: false });
return Role;
};