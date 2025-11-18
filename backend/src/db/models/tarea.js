// backend/src/db/models/tarea.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Tarea = sequelize.define('Tarea', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    tipo_id: { type: DataTypes.BIGINT, allowNull: false },
    lote_id: { type: DataTypes.BIGINT, allowNull: false },
    cosecha_id: { type: DataTypes.BIGINT, allowNull: false },
    periodo_id: { type: DataTypes.BIGINT, allowNull: false },
    fecha_programada: { type: DataTypes.DATE, allowNull: false },
    titulo: { type: DataTypes.STRING, allowNull: true },
    descripcion: { type: DataTypes.TEXT },
    estado: {
      type: DataTypes.ENUM(
        'Pendiente',
        'Asignada',
        'En progreso',
        'Completada',
        'Verificada',
        'Cancelada'
      ),
      defaultValue: 'Pendiente'
    },
    creador_id: { type: DataTypes.BIGINT, allowNull: false },

    // 🔽 NUEVO: datos reales de ejecución
    fecha_inicio_real: { type: DataTypes.DATE, allowNull: true },
    fecha_fin_real: { type: DataTypes.DATE, allowNull: true },
    duracion_real_min: { type: DataTypes.INTEGER, allowNull: true },

  }, {
    tableName: 'tareas',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['lote_id', 'fecha_programada'] },
      { fields: ['estado'] }
    ]
  });

  return Tarea;
};
