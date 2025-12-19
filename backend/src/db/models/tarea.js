// backend/src/db/models/tarea.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Tarea = sequelize.define('Tarea', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    
    // Relaciones Core
    tipo_id: { type: DataTypes.BIGINT, allowNull: false },
    lote_id: { type: DataTypes.BIGINT, allowNull: false },
    cosecha_id: { type: DataTypes.BIGINT, allowNull: false },
    periodo_id: { type: DataTypes.BIGINT, allowNull: false },
    creador_id: { type: DataTypes.BIGINT, allowNull: false },

    // Planificación
    fecha_programada: { type: DataTypes.DATE, allowNull: false },
    titulo: { type: DataTypes.STRING, allowNull: true },
    descripcion: { type: DataTypes.TEXT },
    
    // Ejecución Real
    fecha_inicio_real: { type: DataTypes.DATE, allowNull: true },
    fecha_fin_real: { type: DataTypes.DATE, allowNull: true },
    duracion_real_min: { type: DataTypes.INTEGER, allowNull: true },

    // Estado del Flujo
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

    /**
     * 🧠 EL CEREBRO DEL SISTEMA (JSONB)
     * Aquí se guardan los datos específicos según el tipo.
     * Ej. Nutrición: { metodo: "Drench", agua_litros: 200, ph: 6.5 }
     * Ej. Cosecha: { kg_brutos: 500, clasificacion: [...], rechazos: [...] }
     * Ej. Fito: { plaga: "Hongo", carencia_dias: 7, reingreso_horas: 4 }
     */
    detalles: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {}
    }

  }, {
    tableName: 'tareas',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['lote_id', 'fecha_programada'] },
      { fields: ['estado'] },
      { fields: ['cosecha_id'] },
      // Índice GIN para búsquedas rápidas dentro del JSONB (ej. buscar todas las tareas con "metodo": "Drench")
      { fields: ['detalles'], using: 'gin' } 
    ]
  });

  return Tarea;
};