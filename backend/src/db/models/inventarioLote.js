const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const InventarioLote = sequelize.define('InventarioLote', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    item_id: { type: DataTypes.BIGINT, allowNull: false },
    
    // Trazabilidad Externa
    codigo_lote_proveedor: { 
      type: DataTypes.STRING(100), 
      allowNull: true, 
      comment: 'El código impreso en el envase por el fabricante' 
    },
    
    // Fecha Crítica para FEFO
    fecha_vencimiento: { 
      type: DataTypes.DATEONLY, 
      allowNull: true,
      comment: 'Null para herramientas, Obligatorio para insumos perecibles'
    },

    // Cantidades (Normalizadas a la unidad base del Ítem)
    cantidad_inicial: { type: DataTypes.DECIMAL(14,3), allowNull: false },
    cantidad_actual: { type: DataTypes.DECIMAL(14,3), allowNull: false },

    // Estado
    activo: { type: DataTypes.BOOLEAN, defaultValue: true }, // Se pone false si llega a 0
    observaciones: { type: DataTypes.TEXT }

  }, {
    tableName: 'inventario_lotes',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
  // ✅ Para búsquedas rápidas
  { fields: ['item_id', 'activo'] },
  { fields: ['fecha_vencimiento'] },

  // ✅ Regla Opción B: un lote "único" por (item + codigo_lote + vencimiento)
  // Nota: en Postgres, NULL en fecha_vencimiento permite duplicados (bien para herramientas).
  {
    unique: true,
    fields: ['item_id', 'codigo_lote_proveedor', 'fecha_vencimiento'],
    name: 'uq_inventario_lotes_item_codigo_venc'
  }
]

  });

  return InventarioLote;
};