// backend/src/db/models/tarea.js
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
const Tarea = sequelize.define('Tarea', {
id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
tipo_id: { type: DataTypes.BIGINT, allowNull: false },
lote_id: { type: DataTypes.BIGINT, allowNull: false },
cosecha_id: { type: DataTypes.BIGINT, allowNull: false },
periodo_id: { type: DataTypes.BIGINT, allowNull: false },
fecha_programada: { type: DataTypes.DATEONLY, allowNull: false },
descripcion: { type: DataTypes.TEXT },
estado: { type: DataTypes.ENUM('Pendiente','Asignada','Completada','Verificada','Cancelada'), defaultValue: 'Pendiente' },
creador_id: { type: DataTypes.BIGINT, allowNull: false },
detalles: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} }
}, {
tableName: 'tareas',
timestamps: true,
createdAt: 'created_at',
updatedAt: 'updated_at',
indexes: [
{ fields: ['lote_id','fecha_programada'] },
{ fields: ['estado'] }
]
});
return Tarea;
};