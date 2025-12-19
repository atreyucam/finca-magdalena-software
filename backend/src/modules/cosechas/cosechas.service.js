// backend/src/modules/cosechas/cosechas.service.js
const { models, sequelize } = require('../../db');

function badRequest(message = 'Solicitud inválida') {
  const e = new Error(message);
  e.status = 400;
  e.code = 'BAD_REQUEST';
  return e;
}

/**
 * Genera anio_agricola y codigo para una cosecha
 * - Si no hay fecha_fin → año simple (ej. "2025")
 * - Si hay fecha_fin y cruza de año → "2025-2026"
 */
// Actualizamos la función para recibir el finca_id
function buildCosechaMetadata({
  finca_id, // 🔹 Nuevo parámetro
  numero,
  fecha_inicio,
  fecha_fin = null
}) {
  const inicio = new Date(fecha_inicio);
  const yInicio = inicio.getFullYear();
  let anio_agricola = String(yInicio);
  
  // 🔹 El nuevo código incluirá el ID de la finca: FA-CO-{FINCA}-{NUMERO}-{AÑO}
  let codigo = `FA-CO-F${finca_id}-${numero}-${yInicio}`;

  if (fecha_fin) {
    const fin = new Date(fecha_fin);
    const yFin = fin.getFullYear();
    if (yInicio !== yFin) {
      anio_agricola = `${yInicio}-${yFin}`;
      codigo = `FA-CO-F${finca_id}-${numero}-${yInicio}-${yFin}`;
    }
  }

  return { anio_agricola, codigo };
}


/* ========== LISTAR / OBTENER ========== */

exports.listarCosechas = async () => {
  return await models.Cosecha.findAll({
    include: [{ model: models.PeriodoCosecha }],
    order: [
      ['anio_agricola', 'DESC'],
      ['numero', 'ASC'],
    ],
  });
};

// Helper para el label dinámico [Mes - Mes Año]
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const generarLabelAgricola = (fInicio, fFin) => {
  const inicio = new Date(fInicio);
  const mesI = MESES[inicio.getUTCMonth()];
  const anioI = inicio.getUTCFullYear();
  if (!fFin) return `[${mesI} ${anioI} - Activa]`;
  const fin = new Date(fFin);
  const mesF = MESES[fin.getUTCMonth()];
  const anioF = fin.getUTCFullYear();
  return anioI === anioF ? `[${mesI} - ${mesF} ${anioI}]` : `[${mesI} ${anioI} - ${mesF} ${anioF}]`;
};

exports.obtenerCosecha = async (id) => {
  const cosecha = await models.Cosecha.findByPk(id, {
    include: [
      { model: models.PeriodoCosecha, order: [['id', 'ASC']] },
      { model: models.Finca, attributes: ['nombre'] }
    ],
  });

  if (!cosecha) return null;

// 🛡️ Lógica corregida: Permitir cierre si no hay tareas pendientes
  const totalTareas = await models.Tarea.count({ where: { cosecha_id: id } });
  const verificadas = await models.Tarea.count({ where: { cosecha_id: id, estado: 'Verificada' } });

const puedeCerrar = totalTareas === verificadas; 
  const progreso = totalTareas > 0 ? Math.round((verificadas / totalTareas) * 100) : 100; // 100% si no hay tareas
  return {
    ...cosecha.toJSON(),
    anio_agricola_label: generarLabelAgricola(cosecha.fecha_inicio, cosecha.fecha_fin),
    metricas: {
      totalTareas,
      verificadas,
      progresoVerificacion: progreso,
      puedeCerrar
    }
  };
};

/* ========== CREAR COSECHA ========== */

exports.crearCosecha = async (currentUser, data) => {
  if (currentUser.role !== 'Propietario') {
    throw badRequest('Solo propietario puede crear cosechas');
  }

  const { nombre, numero, fecha_inicio, finca_id } = data;

  if (!finca_id) throw badRequest('finca_id es obligatorio');

  const finca = await models.Finca.findByPk(finca_id);
  if (!finca) throw badRequest('Finca no encontrada');

  if (!nombre) throw badRequest('nombre es obligatorio');
  if (!numero || Number(numero) <= 0) {
    throw badRequest('numero debe ser un entero mayor que 0');
  }
  if (!fecha_inicio) throw badRequest('fecha_inicio es obligatoria');

  const n = Number(numero);

  const { anio_agricola, codigo } = buildCosechaMetadata({
    finca_id: data.finca_id, // 🔹 Pasamos finca_id
    numero: n,
    fecha_inicio,
    fecha_fin: null,
  });

  // ⚠️ Usamos transacción para crear cosecha + periodos
  return await sequelize.transaction(async (t) => {
    const cosecha = await models.Cosecha.create(
      {
        nombre,
        numero: n,
        codigo,
        anio_agricola,
        fecha_inicio,
        finca_id,
        fecha_fin: null,
        estado: 'Activa',
      },
      { transaction: t }
    );

    const periodosBase = [
      { nombre: 'Pre-Floración' },
      { nombre: 'Floración' },
      { nombre: 'Crecimiento' },
      { nombre: 'Cosecha/Recuperación' },
    ];

    await Promise.all(
      periodosBase.map((p) =>
        models.PeriodoCosecha.create(
          {
            cosecha_id: cosecha.id,
            nombre: p.nombre,
          },
          { transaction: t }
        )
      )
    );

    // Devolvemos la cosecha con sus periodos
    const out = await models.Cosecha.findByPk(cosecha.id, {
      include: [{ model: models.PeriodoCosecha }],
      transaction: t,
    });

    return out.toJSON();
  });
};
/* ========== CERRAR COSECHA ========== */

/* ========== CERRAR COSECHA ========== */
exports.cerrarCosecha = async (currentUser, id, data) => {
  if (currentUser.role !== 'Propietario') {
    throw badRequest('Solo propietario puede cerrar cosechas');
  }

  const cosecha = await models.Cosecha.findByPk(id);
  if (!cosecha) throw badRequest('Cosecha no encontrada');
  if (cosecha.estado === 'Cerrada') {
    throw badRequest('La cosecha ya está cerrada');
  }

  const { fecha_fin } = data;
  if (!fecha_fin) throw badRequest('fecha_fin es obligatoria');

  const { anio_agricola, codigo } = buildCosechaMetadata({
    finca_id: cosecha.finca_id, // 👈 AGREGAR ESTA LÍNEA PARA EVITAR EL "Fundefined"
    numero: cosecha.numero,
    fecha_inicio: cosecha.fecha_inicio,
    fecha_fin,
  });

  cosecha.fecha_fin = fecha_fin;
  cosecha.anio_agricola = anio_agricola;
  cosecha.codigo = codigo;
  cosecha.estado = 'Cerrada';

  await cosecha.save();
  return cosecha.toJSON();
};

/* ========== CREAR PERIODOS ========== */

exports.crearPeriodos = async (currentUser, cosechaId, periodos) => {
  if (currentUser.role !== 'Propietario') {
    throw badRequest('Solo propietario');
  }
  if (!Array.isArray(periodos)) {
    throw badRequest('periodos debe ser un arreglo');
  }

  const cosecha = await models.Cosecha.findByPk(cosechaId);
  if (!cosecha) throw badRequest('Cosecha no encontrada');

  const rows = await Promise.all(
    periodos.map((p) => {
      const { nombre } = p;

      if (!nombre) throw badRequest('nombre de periodo es obligatorio');

      return models.PeriodoCosecha.create({
        nombre,
        cosecha_id: cosechaId,
      });
    })
  );
  return rows;
};

/* ========== ACTUALIZAR PERIODO ========== */

exports.actualizarPeriodo = async (currentUser, periodoId, data) => {
  if (currentUser.role !== 'Propietario') {
    throw badRequest('Solo propietario');
  }

  const periodo = await models.PeriodoCosecha.findByPk(periodoId);
  if (!periodo) {
    throw badRequest('Periodo no encontrado');
  }

  const { nombre } = data;

  if (nombre != null) {
    periodo.nombre = nombre; // ENUM valida
  }

  await periodo.save();
  return periodo.toJSON();
};

/* ========== ELIMINAR PERIODO ========== */

exports.eliminarPeriodo = async (currentUser, periodoId) => {
  if (currentUser.role !== 'Propietario') {
    throw badRequest('Solo propietario');
  }

  const periodo = await models.PeriodoCosecha.findByPk(periodoId);
  if (!periodo) {
    throw badRequest('Periodo no encontrado');
  }

  await periodo.destroy();

  return { message: 'Periodo eliminado correctamente' };
};


