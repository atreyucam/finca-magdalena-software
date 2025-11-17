const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TareaAsignacion = sequelize.define('TareaAsignacion', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    tarea_id: { type: DataTypes.BIGINT, allowNull: false },
    usuario_id: { type: DataTypes.BIGINT, allowNull: false },
    rol_en_tarea: { type: DataTypes.ENUM('Ejecutor','Supervisor'), defaultValue: 'Ejecutor' },
    asignado_por_id: { type: DataTypes.BIGINT, allowNull: false },
    fecha_asignacion: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'tarea_asignaciones',
    timestamps: false,
    indexes: [{ unique: true, fields: ['tarea_id','usuario_id'] }]
  });
  return TareaAsignacion;
};
