const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PeriodoCosecha = sequelize.define('PeriodoCosecha', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    cosecha_id: { type: DataTypes.BIGINT, allowNull: false },
    nombre: {
      type: DataTypes.ENUM('Reposo','Floración','Desarrollo','Cosecha/Postcosecha'),
      allowNull: false
    },
    semana_inicio: { type: DataTypes.INTEGER, allowNull: false }, // >=1
    semana_fin: { type: DataTypes.INTEGER, allowNull: false }     // >= semana_inicio
  }, {
    tableName: 'periodos_cosecha',
    timestamps: false
  });
  return PeriodoCosecha;
};
