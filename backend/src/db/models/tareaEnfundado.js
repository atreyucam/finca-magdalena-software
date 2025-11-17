// models/tareaEnfundado.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TareaEnfundado = sequelize.define('TareaEnfundado', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    tarea_id: { type: DataTypes.BIGINT, allowNull: false, unique: true },

    // ⚠️ Lo dejamos por compatibilidad (cantidad absoluta), opcional
    frutos_enfundados: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },

    // ✅ Planificado: % de frutos a enfundar
    porcentaje_frutos_plan_pct: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },

    // ✅ Real: % de frutos enfundados al completar la tarea
    porcentaje_frutos_real_pct: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
  }, {
    tableName: 'tarea_enfundado_detalles',
    timestamps: false,
  });

  return TareaEnfundado;
};
