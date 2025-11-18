const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TareaCosecha = sequelize.define('TareaCosecha', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },

    codigo: { type: DataTypes.STRING(60), allowNull: false, unique: true }, // ej. CO-2025-02-10-L4

    cosecha_id: { type: DataTypes.BIGINT, allowNull: false },
    lote_id: { type: DataTypes.BIGINT, allowNull: false },
    periodo_id: { type: DataTypes.BIGINT },
    tarea_id: { type: DataTypes.BIGINT }, // tarea COSECHA origen

    fecha_cosecha: { type: DataTypes.DATEONLY, allowNull: false },

    // PLANIFICADO
    kg_planificados: { type: DataTypes.DECIMAL(12, 3), allowNull: true },

    // REAL (solo en kg, la finca NO maneja unidades)
    kg_cosechados: { type: DataTypes.DECIMAL(12, 3), allowNull: false, defaultValue: '0.000' },

    // Opcionales:
    grado_madurez: { type: DataTypes.INTEGER }, // escala visual (INIAP), opcional
    notas: { type: DataTypes.TEXT },
  }, {
    tableName: 'tarea_cosecha',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [{ fields: ['cosecha_id', 'lote_id', 'fecha_cosecha'] }],
  });

  return TareaCosecha;
};
