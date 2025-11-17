// models/tareaManejoMaleza.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TareaManejoMaleza = sequelize.define('TareaManejoMaleza', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    tarea_id: { type: DataTypes.BIGINT, allowNull: false, unique: true },

    metodo: {
      type: DataTypes.ENUM('Manual', 'Mecanico', 'Quimico'),
      allowNull: false,
    },

    // ✅ Planificado (usa la misma columna que ya tenías)
    cobertura_planificada_pct: {
      type: DataTypes.DECIMAL(5, 2),
      field: 'cobertura_estimada_pct',   // reutilizamos columna
      allowNull: true,
    },

    // ✅ Nuevo: cobertura real medida por el trabajador (%)
    cobertura_real_pct: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
  }, {
    tableName: 'tarea_maleza_detalles',
    timestamps: false,
  });

  return TareaManejoMaleza;
};
