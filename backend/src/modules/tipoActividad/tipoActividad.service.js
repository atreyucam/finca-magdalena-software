const { models } = require('../../db');

exports.listarTipos = async () => {
  const tipos = await models.TipoActividad.findAll({
    order: [['nombre', 'ASC']],
  });
  return tipos.map(t => t.toJSON());
};
