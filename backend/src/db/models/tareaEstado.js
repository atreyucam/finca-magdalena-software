// backend/src/db/models/tareaEstado.js
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
const TareaEstado = sequelize.define('TareaEstado', {
id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
tarea_id: { type: DataTypes.BIGINT, allowNull: false },
estado: { type: DataTypes.ENUM('Pendiente','Asignada','En progreso','Completada','Verificada','Cancelada'), allowNull: false },
usuario_id: { type: DataTypes.BIGINT, allowNull: false },
fecha: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
comentario: { type: DataTypes.TEXT }
}, { tableName: 'tarea_estados', timestamps: false });
return TareaEstado;
};