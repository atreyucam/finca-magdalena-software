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
function buildCosechaMetadata({
  numero,
  fecha_inicio,
  fecha_fin = null,
  usePlaceholder0000 = false,
}) {
  const inicio = new Date(fecha_inicio);
  if (Number.isNaN(inicio.getTime())) throw badRequest('fecha_inicio inválida');

  const yInicio = inicio.getFullYear();
  let anio_agricola;
  let codigo;

  if (!fecha_fin) {
    // Al crear: solo año de inicio
    anio_agricola = String(yInicio);

    if (usePlaceholder0000) {
      codigo = `FA-CO-${numero}-${yInicio}-0000`;
    } else {
      codigo = `FA-CO-${numero}-${yInicio}`;
    }
  } else {
    const fin = new Date(fecha_fin);
    if (Number.isNaN(fin.getTime())) throw badRequest('fecha_fin inválida');
    if (fin < inicio)
      throw badRequest('La fecha de fin no puede ser anterior a la de inicio');

    const yFin = fin.getFullYear();

    if (yInicio === yFin) {
      anio_agricola = String(yInicio);
      codigo = usePlaceholder0000
        ? `FA-CO-${numero}-${yInicio}-0000`
        : `FA-CO-${numero}-${yInicio}`;
    } else {
      anio_agricola = `${yInicio}-${yFin}`;
      codigo = `FA-CO-${numero}-${yInicio}-${yFin}`;
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

exports.obtenerCosecha = async (id) => {
  return await models.Cosecha.findByPk(id, {
    include: [{ model: models.PeriodoCosecha }],
  });
};

/* ========== CREAR COSECHA ========== */

exports.crearCosecha = async (currentUser, data) => {
  if (currentUser.role !== 'Propietario') {
    throw badRequest('Solo propietario puede crear cosechas');
  }

  const { nombre, numero, fecha_inicio } = data;

  if (!nombre) throw badRequest('nombre es obligatorio');
  if (!numero || Number(numero) <= 0) {
    throw badRequest('numero debe ser un entero mayor que 0');
  }
  if (!fecha_inicio) throw badRequest('fecha_inicio es obligatoria');

  const n = Number(numero);

  const { anio_agricola, codigo } = buildCosechaMetadata({
    numero: n,
    fecha_inicio,
    fecha_fin: null,
    usePlaceholder0000: false,
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
    numero: cosecha.numero,
    fecha_inicio: cosecha.fecha_inicio,
    fecha_fin,
    usePlaceholder0000: false, // o true si quieres el sufijo
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
