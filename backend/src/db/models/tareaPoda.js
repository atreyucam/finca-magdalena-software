// models/tareaPoda.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TareaPoda = sequelize.define('TareaPoda', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    tarea_id: { type: DataTypes.BIGINT, allowNull: false, unique: true },

    // Formacion | Produccion | Sanitaria
    tipo: {
      type: DataTypes.ENUM('Formacion', 'Produccion', 'Sanitaria'),
      allowNull: false,
    },

    // ✅ Nuevo: porcentaje de plantas a intervenir (planificado)
    porcentaje_plantas_plan_pct: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },

    // ✅ Nuevo: porcentaje real de plantas intervenidas al completar
    porcentaje_plantas_real_pct: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },

    herramientas_desinfectadas: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  }, {
    tableName: 'tarea_poda_detalles',
    timestamps: false,
  });

  return TareaPoda;
};
