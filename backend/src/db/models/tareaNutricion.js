const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TareaNutricion = sequelize.define('TareaNutricion', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    tarea_id: { type: DataTypes.BIGINT, allowNull: false, unique: true },
    metodo_aplicacion: { type: DataTypes.ENUM('Drench','Foliar','Directo_Suelo', 'Fertirriego'), allowNull: false },

    // nuevo:
    porcentaje_plantas_plan_pct: { type: DataTypes.DECIMAL(5,2), allowNull: true },
    porcentaje_plantas_real_pct: { type: DataTypes.DECIMAL(5,2), allowNull: true },
  }, {
    tableName: 'tarea_nutricion_detalles',
    timestamps: false
  });
  return TareaNutricion;
};
