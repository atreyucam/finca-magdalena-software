const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const HerramientaPrestamo = sequelize.define('HerramientaPrestamo', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    item_id: { type: DataTypes.BIGINT, allowNull: false },     // Herramienta/Equipo
    usuario_id: { type: DataTypes.BIGINT, allowNull: false },
    estado: { type: DataTypes.ENUM('Prestada','Devuelta','Dañada','Extraviada'), allowNull: false, defaultValue: 'Prestada' },
    fecha_salida: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    fecha_devolucion: { type: DataTypes.DATE },
    observacion: { type: DataTypes.TEXT }
  }, {
    tableName: 'herramienta_prestamos',
    timestamps: false,
    indexes: [{ fields: ['item_id','usuario_id','estado'] }]
  });
  return HerramientaPrestamo;
};
