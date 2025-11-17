// backend/src/db/models/tareaItems.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TareaItem = sequelize.define('TareaItem', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },

    tarea_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: { model: 'tareas', key: 'id' },
      onDelete: 'CASCADE',
    },

    item_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: { model: 'inventario_items', key: 'id' },
    },

    // 'Insumo' | 'Herramienta' | 'Equipo'
    categoria: {
      type: DataTypes.ENUM('Insumo','Herramienta','Equipo'),
      allowNull: false,
    },

    unidad_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: { model: 'unidades', key: 'id' },
    },

    // Planificado por el técnico al configurar la tarea
    cantidad_planificada: {
      type: DataTypes.DECIMAL(14,3),
      allowNull: false,
      defaultValue: '0.000',
    },

    // Real usado / entregado (set en completar/verificar)
    cantidad_real: {
      type: DataTypes.DECIMAL(14,3),
      allowNull: false,
      defaultValue: '0.000',
    },

    // Para ordenar en el frontend (opcional)
    idx: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  }, {
    tableName: 'tarea_items',
    timestamps: false,
    indexes: [
      { fields: ['tarea_id'] },
      { fields: ['item_id'] },
    ],
  });

  return TareaItem;
};
