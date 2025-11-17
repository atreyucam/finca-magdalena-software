const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const NominaDetalle = sequelize.define('NominaDetalle', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    nomina_id: { type: DataTypes.BIGINT, allowNull: false },
    trabajador_id: { type: DataTypes.BIGINT, allowNull: false },
    tareas_completadas: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    monto_base: { type: DataTypes.DECIMAL(12,2), allowNull: false, defaultValue: '0.00' },
    ajustes: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] }, // [{tipo,monto,motivo}]
    monto_total: { type: DataTypes.DECIMAL(12,2), allowNull: false, defaultValue: '0.00' },
    observaciones: { type: DataTypes.TEXT },
    recibo_pdf_path: { type: DataTypes.TEXT },
    moneda: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'USD' }
  }, {
    tableName: 'nomina_detalles',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [{ fields: ['nomina_id','trabajador_id'] }]
  });
  return NominaDetalle;
};
