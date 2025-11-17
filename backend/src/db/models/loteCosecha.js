const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LoteCosecha = sequelize.define('LoteCosecha', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    codigo: { type: DataTypes.STRING(60), allowNull: false, unique: true }, // ej. CO-2025-02-10-L4
    cosecha_id: { type: DataTypes.BIGINT, allowNull: false },
    lote_id: { type: DataTypes.BIGINT, allowNull: false },
    periodo_id: { type: DataTypes.BIGINT },
    tarea_id: { type: DataTypes.BIGINT }, // tarea COSECHA origen
    fecha_cosecha: { type: DataTypes.DATEONLY, allowNull: false },
    kg_cosechados: { type: DataTypes.DECIMAL(12,3), allowNull: false, defaultValue: '0.000' },
    numero_frutos: { type: DataTypes.INTEGER, defaultValue: 0 },
    grado_madurez: { type: DataTypes.INTEGER }, // escala visual (INIAP), opcional
    notas: { type: DataTypes.TEXT }
  }, {
    tableName: 'lotes_cosecha',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [{ fields: ['cosecha_id','lote_id','fecha_cosecha'] }]
  });
  return LoteCosecha;
};
