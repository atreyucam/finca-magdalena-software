// backend/src/db/models/nominaDetalle.js
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const NominaDetalle = sequelize.define(
    "NominaDetalle",
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },

      nomina_id: { type: DataTypes.BIGINT, allowNull: false },
      trabajador_id: { type: DataTypes.BIGINT, allowNull: false },

      // KPI para tabla/modal
      tareas_completadas: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      dias_laborados: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      dias: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] }, // ["Lun","Mié",...]

      // Nómina
      monto_base: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: "0.00" },
      ajustes: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] }, // [{tipo,monto,motivo}]
      monto_total: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: "0.00" },
      observaciones: { type: DataTypes.TEXT },

      // Gestión
      excluido: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },

      // Método de pago (editable en Tab 1)
      metodo_pago: {
        type: DataTypes.ENUM("Efectivo", "Transferencia", "Cheque", "Otro"),
        allowNull: false,
        defaultValue: "Efectivo",
      },
      metodo_pago_otro: { type: DataTypes.STRING(80), allowNull: true },

      // Comprobante (por trabajador y por semana)
      comprobante: { type: DataTypes.STRING(80), allowNull: true },

      // PDF (si lo mantienes)
      recibo_pdf_path: { type: DataTypes.TEXT },

      moneda: { type: DataTypes.STRING(3), allowNull: false, defaultValue: "USD" },
    },
    {
      tableName: "nomina_detalles",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [{ fields: ["nomina_id", "trabajador_id"] }],
    }
  );

  return NominaDetalle;
};
