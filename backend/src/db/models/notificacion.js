// backend/src/db/models/notificacion.js
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
const Notificacion = sequelize.define('Notificacion', {
id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
usuario_id: { type: DataTypes.BIGINT, allowNull: false }, // receptor
tipo: { type: DataTypes.ENUM('Tarea','Inventario','Pago','General'), allowNull: false },
titulo: { type: DataTypes.STRING(200), allowNull: false },
mensaje: { type: DataTypes.TEXT },
referencia: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} }, // {tarea_id, item_id, nomina_id, detalle_id}
leida: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
prioridad: { type: DataTypes.ENUM('Info','Alerta'), allowNull: false, defaultValue: 'Info' }
}, {
tableName: 'notificaciones',
timestamps: true,
createdAt: 'created_at',
updatedAt: 'updated_at',
indexes: [
{ fields: ['usuario_id','leida'] },
{ fields: ['tipo'] },
{ fields: ['created_at'] }
]
});
return Notificacion;
};