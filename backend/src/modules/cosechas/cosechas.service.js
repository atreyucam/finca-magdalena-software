const { models } = require('../../db');

exports.listarCosechas = async () => {
  return await models.Cosecha.findAll({
    include: [{ model: models.PeriodoCosecha }],
    order: [['anio_agricola', 'DESC'], ['numero', 'ASC']]
  });
};

exports.obtenerCosecha = async (id) => {
  return await models.Cosecha.findByPk(id, {
    include: [{ model: models.PeriodoCosecha }]
  });
};

exports.crearCosecha = async (currentUser, data) => {
  if (currentUser.role !== 'Propietario') throw new Error('Solo propietario');
  const { nombre, numero, anio_agricola, fecha_inicio, fecha_fin } = data;
  return await models.Cosecha.create({
    nombre,
    numero,
    anio_agricola,
    fecha_inicio,
    fecha_fin,
    estado: 'Activa'
  });
};

exports.crearPeriodos = async (currentUser, cosechaId, periodos) => {
  if (currentUser.role !== 'Propietario') throw new Error('Solo propietario');
  if (!Array.isArray(periodos)) throw new Error('periodos debe ser un arreglo');
  const cosecha = await models.Cosecha.findByPk(cosechaId);
  if (!cosecha) throw new Error('Cosecha no encontrada');

  const rows = await Promise.all(periodos.map(p =>
    models.PeriodoCosecha.create({ ...p, cosecha_id: cosechaId })
  ));
  return rows;
};
