// backend/src/db/models/periodoCosecha.js
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const PeriodoCosecha = sequelize.define("PeriodoCosecha", {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    cosecha_id: { type: DataTypes.BIGINT, allowNull: false },
    nombre: {
      type: DataTypes.ENUM("Reposo", "Floración", "Desarrollo", "Cosecha/Postcosecha"),
      allowNull: false
    },
    semana_inicio: { type: DataTypes.INTEGER, allowNull: false },
    semana_fin: { type: DataTypes.INTEGER, allowNull: false }
  }, {
    tableName: "periodos_cosecha",
    timestamps: false
  });

  return PeriodoCosecha;
};
