// backend/src/modules/cosechas/cosechas.service.js
const { models, sequelize } = require('../../db');
const notifs = require('../notificaciones/notificaciones.service');
const { badRequest } = require('../../utils/errors'); 


/**
 * Genera anio_agricola y codigo para una cosecha
 * - Si no hay fecha_fin → año simple (ej. "2025")
 * - Si hay fecha_fin y cruza de año → "2025-2026"
 */
// Actualizamos la función para recibir el finca_id
function buildCosechaMetadata({ finca_id, numero, fecha_inicio, fecha_fin = null }) {
  const inicio = new Date(fecha_inicio);
  const yInicio = inicio.getFullYear();

  const fincaCode = `F${String(finca_id).padStart(2, "0")}`;
  const numCode   = String(numero).padStart(3, "0");

  // Por defecto: año simple (si no cruza)
  let anio_agricola = String(yInicio);
  let yearPart = String(yInicio);

  if (fecha_fin) {
    const fin = new Date(fecha_fin);
    const yFin = fin.getFullYear();

    if (yInicio !== yFin) {
      anio_agricola = `${yInicio}-${yFin}`;
      yearPart = `${yInicio}-${yFin}`;
    }
  }

  // ✅ Formato final unificado
  const codigo = `FA-CO-${fincaCode}-${yearPart}-${numCode}`;

  return { anio_agricola, codigo };
}


function parseFechaFlexible(fechaStr) {
  if (!fechaStr || typeof fechaStr !== "string") return null;

  // 1) ISO: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) {
    const d = new Date(`${fechaStr}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // 2) Latam: DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(fechaStr)) {
    const [dd, mm, yyyy] = fechaStr.split("/").map((x) => Number(x));
    if (!dd || !mm || !yyyy) return null;

    // construimos ISO manual para que no dependa del parser de JS
    const iso = `${String(yyyy).padStart(4, "0")}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
    const d = new Date(`${iso}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // 3) fallback (no recomendado, pero por si llega otra cosa)
  const d = new Date(fechaStr);
  return Number.isNaN(d.getTime()) ? null : d;
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

const totalTareas = await models.Tarea.count({ where: { cosecha_id: id } });

const verificadas = await models.Tarea.count({
  where: { cosecha_id: id, estado: "Verificada" },
});

const canceladas = await models.Tarea.count({
  where: { cosecha_id: id, estado: "Cancelada" },
});

// ✅ Opción A: estado final = Verificada o Cancelada
const finalizadas = verificadas + canceladas;

// ✅ Puede cerrar si NO hay tareas en estados no-finales
const puedeCerrar = totalTareas === finalizadas;

// ✅ Progreso basado en finalizadas (no solo verificadas)
const progreso = totalTareas > 0 ? Math.round((finalizadas / totalTareas) * 100) : 100;
  return {
    ...cosecha.toJSON(),
    anio_agricola_label: generarLabelAgricola(cosecha.fecha_inicio, cosecha.fecha_fin),
    metricas: {
  totalTareas,
  verificadas,
  canceladas,
  finalizadas,
  progresoVerificacion: progreso,
  puedeCerrar,
}

  };
};

/* ========== CREAR COSECHA ========== */

exports.crearCosecha = async (currentUser, data) => {
  if (currentUser.role !== 'Propietario') {
    throw badRequest('Solo propietario puede crear cosechas');
  }

  const { nombre, fecha_inicio, finca_id } = data;

  if (!finca_id) throw badRequest('finca_id es obligatorio');
  const finca = await models.Finca.findByPk(finca_id);
  if (!finca) throw badRequest('Finca no encontrada');

  if (!nombre) throw badRequest('nombre es obligatorio');
  if (!fecha_inicio) throw badRequest('fecha_inicio es obligatoria');

  return await sequelize.transaction(async (t) => {
    // 1) Bloqueo: 1 activa por finca
    const yaActiva = await models.Cosecha.findOne({
      where: { finca_id, estado: 'Activa' },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (yaActiva) {
      const e = new Error(`Ya existe una cosecha ACTIVA en esta finca (${yaActiva.codigo}). Cierra esa cosecha antes de crear otra.`);
      e.status = 409;
      e.code = 'COSECHA_ACTIVA_EXISTE';
      e.data = { cosecha_id: yaActiva.id, codigo: yaActiva.codigo }; // 👈 útil para UX
      throw e;
    }

    // 2) Año agrícola (simple: año calendario desde fecha_inicio)
   const d = parseFechaFlexible(fecha_inicio);
if (!d) throw badRequest("fecha_inicio inválida (usa YYYY-MM-DD o DD/MM/YYYY)");
const year = String(d.getFullYear());


    // 3) Siguiente secuencial por finca + año
    const last = await models.Cosecha.findOne({
      where: { finca_id, anio_agricola: year },
      order: [['numero', 'DESC']],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    const nextNumero = (last?.numero ?? 0) + 1;

    // 4) Construir código FA-CO-F01-2026-001
    const fincaCode = `F${String(finca_id).padStart(2, '0')}`; // o usa finca.codigo si existe
    const codigo = `FA-CO-${fincaCode}-${year}-${String(nextNumero).padStart(3, '0')}`;

    const cosecha = await models.Cosecha.create({
      nombre,
      numero: nextNumero,
      codigo,
      anio_agricola: year,
      fecha_inicio,
      finca_id,
      fecha_fin: null,
      estado: 'Activa',
    }, { transaction: t });

    // Periodos
    const periodosBase = [
      { nombre: 'Pre-Floración' },
      { nombre: 'Floración' },
      { nombre: 'Crecimiento' },
      { nombre: 'Cosecha/Recuperación' },
    ];

    await Promise.all(
      periodosBase.map((p) =>
        models.PeriodoCosecha.create(
          { cosecha_id: cosecha.id, nombre: p.nombre },
          { transaction: t }
        )
      )
    );

    // Notificación
    await notifs.crearParaRoles(['Propietario', 'Tecnico'], {
      tipo: 'General',
      titulo: 'Nueva cosecha iniciada',
      mensaje: `Se inició la cosecha "${cosecha.nombre}" (${cosecha.codigo}).`,
      referencia: { cosecha_id: cosecha.id, finca_id: cosecha.finca_id },
      prioridad: 'Info',
    });

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

const fechaFinParsed = parseFechaFlexible(fecha_fin);
if (!fechaFinParsed) {
  throw badRequest('fecha_fin inválida (usa YYYY-MM-DD o DD/MM/YYYY)');
}


 const { anio_agricola, codigo } = buildCosechaMetadata({
  finca_id: cosecha.finca_id,
  numero: cosecha.numero,
  fecha_inicio: cosecha.fecha_inicio,
  fecha_fin: fechaFinParsed.toISOString().slice(0, 10),
});


  cosecha.fecha_fin = fecha_fin;
  cosecha.anio_agricola = anio_agricola;
  cosecha.codigo = codigo;
  cosecha.estado = 'Cerrada';

  await cosecha.save();
  await notifs.crearParaRoles(['Propietario', 'Tecnico'], {
  tipo: 'General',
  titulo: 'Cosecha cerrada',
  mensaje: `Se cerró la cosecha "${cosecha.nombre}" (${cosecha.codigo}).`,
  referencia: { cosecha_id: cosecha.id, finca_id: cosecha.finca_id },
  prioridad: 'Info',
});

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



exports.previewNextCosecha = async (currentUser, query) => {
  console.log("[previewNextCosecha] query =", query);

  if (currentUser.role !== "Propietario") {
    throw badRequest("Solo propietario");
  }

  const { finca_id, fecha_inicio } = query;

  const fincaIdNum = Number(finca_id);
  if (!Number.isInteger(fincaIdNum) || fincaIdNum <= 0) {
    throw badRequest("finca_id inválido");
  }

  const d = parseFechaFlexible(fecha_inicio);
  console.log("[previewNextCosecha] parsed date =", {
  fecha_inicio,
  parsed: d ? d.toISOString() : null,
});
  if (!d) {
    throw badRequest("fecha_inicio inválida (usa YYYY-MM-DD o DD/MM/YYYY)");
  }
  

  const year = String(d.getFullYear());


  const finca = await models.Finca.findByPk(fincaIdNum);
  if (!finca) throw badRequest("Finca no encontrada");

  console.log("[previewNextCosecha] year =", year, "fincaIdNum =", fincaIdNum);

  const last = await models.Cosecha.findOne({
    where: { finca_id: fincaIdNum, anio_agricola: year },
    order: [["numero", "DESC"]],
  });

  const nextNumero = (last?.numero ?? 0) + 1;

  const fincaCode = `F${String(fincaIdNum).padStart(2, "0")}`;
  const codigoPreview = `FA-CO-${fincaCode}-${year}-${String(nextNumero).padStart(3, "0")}`;

  return { anio: year, nextNumero, codigoPreview };
};
