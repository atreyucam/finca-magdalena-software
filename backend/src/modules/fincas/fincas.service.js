const { models } = require('../../db');

function badRequest(message) {
  const e = new Error(message);
  e.status = 400;
  return e;
}

exports.crearFinca = async (data) => {
  if (!data.nombre) throw badRequest('El nombre de la finca es obligatorio');
  return await models.Finca.create(data);
};

exports.listarFincas = async () => {
  return await models.Finca.findAll({
    include: [{ 
      model: models.Lote, 
      as: 'lotes',
      attributes: ['id', 'nombre', 'superficie_ha', 'estado', 'numero_plantas']
    }],
    order: [['nombre', 'ASC']]
  });
};

exports.obtenerFinca = async (id) => {
  const finca = await models.Finca.findByPk(id, {
    include: [{ model: models.Lote, as: 'lotes' }]
  });
  if (!finca) throw badRequest('Finca no encontrada');
  return finca;
};

exports.editarFinca = async (id, data) => {
  const finca = await models.Finca.findByPk(id);
  if (!finca) throw badRequest('Finca no encontrada');
  
  const fields = ['nombre', 'hectareas_totales', 'ubicacion', 'estado'];
  fields.forEach(f => {
    if (f in data) finca[f] = data[f];
  });

  return await finca.save();
};

exports.cambiarEstadoFinca = async (id) => {
  const finca = await models.Finca.findByPk(id);
  if (!finca) throw badRequest('Finca no encontrada');
  
  finca.estado = finca.estado === 'Activo' ? 'Inactivo' : 'Activo';
  return await finca.save();
};


// backend/src/modules/fincas/fincas.service.js

/**
 * Obtiene el contexto necesario para crear tareas en una finca específica.
 * Retorna: Datos de la finca, sus lotes activos y la cosecha actualmente abierta.
 */
exports.obtenerContexto = async (fincaId) => {
  // 1. Verificar existencia de la finca
  const finca = await models.Finca.findByPk(fincaId, {
    attributes: ['id', 'nombre', 'hectareas_totales']
  });

  if (!finca) {
    const e = new Error("Finca no encontrada");
    e.status = 404;
    throw e;
  }

  // 2. Obtener lotes activos de esta finca
  const lotes = await models.Lote.findAll({
    where: { 
      finca_id: fincaId, 
      estado: 'Activo' 
    },
    attributes: ['id', 'nombre', 'superficie_ha', 'numero_plantas'],
    order: [['nombre', 'ASC']]
  });

  // 3. Obtener la cosecha activa para esta finca
  // Esto es clave porque FM y FR tienen calendarios distintos.
  const cosechaActiva = await models.Cosecha.findOne({
    where: { 
      finca_id: fincaId, 
      estado: 'Activa' 
    },
    include: [{ 
      model: models.PeriodoCosecha, 
      attributes: ['id', 'nombre'] 
    }],
    attributes: ['id', 'nombre', 'codigo', 'anio_agricola', 'fecha_inicio']
  });

  return {
    finca,
    lotes,
    cosechaActiva: cosechaActiva || null // Puede que la finca no tenga cosecha abierta aún
  };
};