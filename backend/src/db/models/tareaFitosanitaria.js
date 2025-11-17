const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TareaFitosanitaria = sequelize.define('TareaFitosanitaria', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    tarea_id: { type: DataTypes.BIGINT, allowNull: false, unique: true },
    plaga_enfermedad: { type: DataTypes.STRING(150), allowNull: false },
    conteo_umbral: { type: DataTypes.STRING(100) },
    fecha_hora_inicio: { type: DataTypes.DATE, allowNull: false },
    fecha_hora_fin: { type: DataTypes.DATE, allowNull: false },
    volumen_aplicacion_lt: { type: DataTypes.DECIMAL(10,2) },
    equipo_aplicacion: { type: DataTypes.STRING(100) },
    temp_celsius: { type: DataTypes.DECIMAL(4,1) },
    viento_kmh: { type: DataTypes.DECIMAL(5,1) },
    humedad_pct: { type: DataTypes.DECIMAL(4,1) },
    periodo_carencia_dias: { type: DataTypes.INTEGER, allowNull: false },
    porcentaje_plantas_plan_pct: { type: DataTypes.DECIMAL(5,2), allowNull: true },
porcentaje_plantas_real_pct: { type: DataTypes.DECIMAL(5,2), allowNull: true },

  }, {
    tableName: 'tarea_fitosanitaria_detalles',
    timestamps: false
  });
  return TareaFitosanitaria;
};
