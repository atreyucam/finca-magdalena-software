const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Venta = sequelize.define(
    "Venta",
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      numero_factura: { type: DataTypes.STRING(80), allowNull: false, unique: true },
      cliente_id: { type: DataTypes.BIGINT, allowNull: false },
      numero_recibo: { type: DataTypes.STRING(80), allowNull: true },
      fecha_entrega: { type: DataTypes.DATEONLY, allowNull: false },
      lote_id: { type: DataTypes.BIGINT, allowNull: false },
      tipo_venta: {
        type: DataTypes.ENUM("EXPORTACION", "NACIONAL"),
        allowNull: false,
      },
      gavetas_entregadas: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      gavetas_devueltas: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
      gavetas_utiles: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
      subtotal: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: "0.00" },
      total: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: "0.00" },
      estado: {
        type: DataTypes.ENUM("PENDIENTE", "LIQUIDADA", "PAGADA", "CANCELADA"),
        allowNull: false,
        defaultValue: "PENDIENTE",
      },
      forma_pago: { type: DataTypes.STRING(40), allowNull: true },
      fecha_liquidacion: { type: DataTypes.DATEONLY, allowNull: true },
      fecha_pago: { type: DataTypes.DATEONLY, allowNull: true },
      observacion: { type: DataTypes.TEXT, allowNull: true },
      observacion_pago: { type: DataTypes.TEXT, allowNull: true },
      reclasificacion_destino: {
        type: DataTypes.ENUM("NACIONAL", "RECHAZO"),
        allowNull: true,
      },
      reclasificacion_gavetas: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: "0.00",
      },
      creado_por: { type: DataTypes.BIGINT, allowNull: false },
      liquidado_por: { type: DataTypes.BIGINT, allowNull: true },
      pagado_por: { type: DataTypes.BIGINT, allowNull: true },
    },
    {
      tableName: "ventas",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        { unique: true, fields: ["numero_factura"] },
        { fields: ["cliente_id"] },
        { fields: ["lote_id"] },
        { fields: ["estado"] },
        { fields: ["tipo_venta"] },
        { fields: ["fecha_entrega"] },
      ],
    }
  );

  return Venta;
};
