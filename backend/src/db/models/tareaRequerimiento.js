// backend/src/db/models/tareaRequerimiento.js
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const TareaRequerimiento = sequelize.define('TareaRequerimiento', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    tarea_id: { type: DataTypes.BIGINT, allowNull: false },
    item_id: { type: DataTypes.BIGINT, allowNull: false },
    unidad_id: { type: DataTypes.BIGINT, allowNull: false }, // normalmente 'unidad'
    cantidad: { type: DataTypes.DECIMAL(14,3), allowNull: false, defaultValue: '1' },
    categoria: { type: DataTypes.ENUM('Herramienta','Equipo'), allowNull: false }, // redundante para filtros rápidos
  }, {
    tableName: 'tarea_requerimientos',
    timestamps: false,
    indexes: [{ fields: ['tarea_id'] }, { fields: ['categoria'] }]
  });
  return TareaRequerimiento;
};
