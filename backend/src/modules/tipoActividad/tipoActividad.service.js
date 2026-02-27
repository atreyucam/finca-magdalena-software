const { models } = require('../../db');

const LABELS_POR_CODIGO = {
  poda: "Poda",
  maleza: "Control de malezas",
  nutricion: "Fertilizacion",
  fitosanitario: "Control fitosanitario",
  enfundado: "Enfundado",
  cosecha: "Cosecha",
};

exports.listarTipos = async () => {
  const tipos = await models.TipoActividad.findAll({
    order: [['nombre', 'ASC']],
  });
  return tipos.map((t) => {
    const j = t.toJSON();
    const codigo = String(j.codigo || "").toLowerCase();
    return {
      ...j,
      nombre: LABELS_POR_CODIGO[codigo] || j.nombre,
    };
  });
};
