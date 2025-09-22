// backend/src/db/models/nominaSemana.js
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
const NominaSemana = sequelize.define('NominaSemana', {
id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
semana_iso: { type: DataTypes.STRING(10), allowNull: false }, // p.ej. 2025-W37
fecha_inicio: { type: DataTypes.DATEONLY, allowNull: false }, // lunes
fecha_fin: { type: DataTypes.DATEONLY, allowNull: false }, // domingo
estado: { type: DataTypes.ENUM('Borrador','Aprobada'), defaultValue: 'Borrador' },
creado_por_id: { type: DataTypes.BIGINT, allowNull: false },
aprobado_por_id: { type: DataTypes.BIGINT },
aprobado_at: { type: DataTypes.DATE },
}, { tableName: 'nomina_semanas', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at', indexes: [{ unique: true, fields: ['semana_iso'] }] });
return NominaSemana;
};