// backend/src/db/models/nominaSemana.js
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const NominaSemana = sequelize.define(
    "NominaSemana",
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },

      // ej: 2025-W37
      semana_iso: { type: DataTypes.STRING(10), allowNull: false },

      // Semana Lunes -> Domingo
      fecha_inicio: { type: DataTypes.DATEONLY, allowNull: false },
      fecha_fin: { type: DataTypes.DATEONLY, allowNull: false },

      // opcional: para filtrar Tab 2
      cosecha_id: { type: DataTypes.BIGINT, allowNull: true },

      estado: {
        type: DataTypes.ENUM("Borrador", "Aprobada"),
        allowNull: false,
        defaultValue: "Borrador",
      },

      creado_por_id: { type: DataTypes.BIGINT, allowNull: false },
      aprobado_por_id: { type: DataTypes.BIGINT, allowNull: true },
      aprobado_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
      tableName: "nomina_semanas",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [{ unique: true, fields: ["semana_iso"] }],
    }
  );

  return NominaSemana;
};
