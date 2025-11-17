const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const InventarioReserva = sequelize.define('InventarioReserva', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    tarea_id: { type: DataTypes.BIGINT, allowNull: false },
    item_id: { type: DataTypes.BIGINT, allowNull: false },
    cantidad_en_base: { type: DataTypes.DECIMAL(14,3), allowNull: false }, // normalizada a unidad base
    estado: { type: DataTypes.ENUM('Reservada','Consumida','Anulada'), allowNull: false, defaultValue: 'Reservada' },
    fecha: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'inventario_reservas',
    timestamps: false,
    indexes: [
      { fields: ['item_id','estado'] },
      { fields: ['tarea_id','estado'] }
    ]
  });
  return InventarioReserva;
};
