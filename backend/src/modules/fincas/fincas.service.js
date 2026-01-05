const { models } = require('../../db');
const notifs = require('../notificaciones/notificaciones.service');
const { badRequest } = require('../../utils/errors'); 



exports.crearFinca = async (data) => {
  if (!data.nombre) throw badRequest('El nombre de la finca es obligatorio');

  const finca = await models.Finca.create(data);

  await notifs.crearParaRoles(['Propietario', 'Tecnico'], {
    tipo: 'General',
    titulo: 'Nueva finca registrada',
    mensaje: `Se creó "${finca.nombre}".`,
    referencia: { finca_id: finca.id },
    prioridad: 'Info',
  });

  return finca;
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
  if (!finca) throw badRequest("Finca no encontrada");

  const fields = ["nombre", "hectareas_totales", "ubicacion", "estado"];

  // Snapshot antes (para detectar cambios)
  const antes = {};
  fields.forEach((f) => (antes[f] = finca[f]));

  // Aplicar cambios
  fields.forEach((f) => {
    if (f in data) finca[f] = data[f];
  });

  await finca.save();

  // Detectar qué cambió realmente
  const cambios = fields.filter((f) => antes[f] !== finca[f]);

  // Si hubo cambios, notificar
  if (cambios.length > 0) {
    const listaCambios = cambios
      .map((f) => {
        const etiqueta = {
          nombre: "Nombre",
          hectareas_totales: "Hectáreas",
          ubicacion: "Ubicación",
          estado: "Estado",
        }[f] || f;

        return `${etiqueta}: "${antes[f] ?? "-"}" → "${finca[f] ?? "-"}"`;
      })
      .join(" | ");

    await notifs.crearParaRoles(["Propietario", "Tecnico"], {
      tipo: "General",
      titulo: "Finca actualizada",
      mensaje: `Se modificó la información de la finca "${finca.nombre}". ${listaCambios}`,
      referencia: { finca_id: finca.id },
      prioridad: "Info", // ajusta si tu enum no tiene Info
    });
  }

  return finca.toJSON ? finca.toJSON() : finca;
};


exports.cambiarEstadoFinca = async (id, data = {}) => {
  const finca = await models.Finca.findByPk(id);
  if (!finca) throw badRequest("Finca no encontrada");

  const permitido = ["Activo", "Inactivo"];
  const nuevo = data.estado;

  // Determinar estado final
  let nuevoEstadoFinal = finca.estado;

  if (nuevo) {
    if (!permitido.includes(nuevo)) throw badRequest("estado inválido");
    nuevoEstadoFinal = nuevo;
  } else {
    // fallback: toggle
    nuevoEstadoFinal = finca.estado === "Activo" ? "Inactivo" : "Activo";
  }

  // Si no hay cambio, solo guarda (o retorna sin notificar)
  if (nuevoEstadoFinal === finca.estado) {
    return await finca.save();
  }

  finca.estado = nuevoEstadoFinal;
  await finca.save();

  // Notificaciones según estado
  if (nuevoEstadoFinal === "Inactivo") {
    await notifs.crearParaRoles(["Propietario", "Tecnico"], {
      tipo: "General",
      titulo: "Finca deshabilitada",
      mensaje: `La finca "${finca.nombre}" fue marcada como Inactiva.`,
      referencia: { finca_id: finca.id },
      prioridad: "Alerta",
    });
  } else {
    await notifs.crearParaRoles(["Propietario", "Tecnico"], {
      tipo: "General",
      titulo: "Finca habilitada",
      mensaje: `La finca "${finca.nombre}" fue marcada como Activa.`,
      referencia: { finca_id: finca.id },
      prioridad: "Info", // ajusta a tu enum si no existe
    });
  }

  return finca.toJSON ? finca.toJSON() : finca;
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