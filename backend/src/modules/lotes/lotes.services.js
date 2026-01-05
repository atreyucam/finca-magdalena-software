const { models, sequelize } = require('../../db');
const { Op } = require('sequelize');
const notifs = require('../notificaciones/notificaciones.service');
const { badRequest } = require('../../utils/errors'); 



exports.crearLote = async (data) => {
  const { nombre, superficie_ha, numero_plantas, fecha_siembra, estado, finca_id } = data;
  
  // Validaciones críticas
  if (!nombre) throw badRequest('El nombre del lote es obligatorio');
  if (!finca_id) throw badRequest('Debe asignar el lote a una finca (finca_id)');

  // 🔹 Verificar que la finca existe
  const finca = await models.Finca.findByPk(finca_id);
  if (!finca) throw badRequest('La finca especificada no existe');

  // 🔹 Verificar que no exista un lote con el mismo nombre EN LA MISMA FINCA
  const existe = await models.Lote.findOne({ where: { nombre, finca_id } });
  if (existe) throw badRequest('Ya existe un lote con ese nombre en esta finca');

  try {
    const l = await models.Lote.create({
      nombre,
      finca_id,
      superficie_ha: superficie_ha ?? 0,
      numero_plantas: numero_plantas ?? 0,
      fecha_siembra: fecha_siembra || null,
      estado: estado || 'Activo',
    });
    await notifs.crearParaRoles(['Propietario', 'Tecnico'], {
  tipo: 'General',
  titulo: 'Nuevo lote creado',
  mensaje: `Se creó el lote "${l.nombre}" en ${finca.nombre}.`,
  referencia: { lote_id: l.id, finca_id: l.finca_id },
  prioridad: 'Info',
});

    return l.toJSON();
  } catch (err) {
    throw err;
  }
};

// Modificamos el listar para que incluya el nombre de la finca
exports.listarLotes = async () => {
  const list = await models.Lote.findAll({ 
    include: [{ model: models.Finca, as: 'finca', attributes: ['nombre'] }],
    order: [['created_at', 'DESC']] 
  });
  return list.map((l) => l.toJSON());
};


exports.obtenerLote = async (id, opts = {}) => {
  const { incluirTareas = false, page = 1, limit = 15, filtro } = opts;
  // 🔹 MODIFICACIÓN: Agregamos include de Finca aquí
  const l = await models.Lote.findByPk(id, {
    include: [{ 
      model: models.Finca, 
      as: 'finca', 
      attributes: ['id', 'nombre', 'ubicacion'],
    }]
  });

  if (!l) return null;

  const loteJson = l.toJSON();

  // 1. Resumen de contadores
  const estadosAgg = await models.Tarea.findAll({
    attributes: [
      "estado",
      [sequelize.fn("COUNT", sequelize.col("*")), "total"],
    ],
    where: { lote_id: id },
    group: ["estado"],
  });

  const byEstado = {};
  estadosAgg.forEach((r) => { byEstado[r.estado] = Number(r.get("total")); });
  
  const resumenTareas = {
    total: Object.values(byEstado).reduce((a, b) => a + b, 0),
    pendientes: (byEstado.Pendiente || 0) + (byEstado.Asignada || 0),
    en_progreso: (byEstado["En progreso"] || 0),
    completadas: (byEstado.Completada || 0),
    verificadas: (byEstado.Verificada || 0),
    canceladas: (byEstado.Cancelada || 0),
  };

  if (!incluirTareas) return { ...loteJson, resumenTareas };

  // 2. Filtros Dinámicos
  const whereTareas = { lote_id: id };

  if (filtro) {
    switch (filtro) {
      case 'Pendientes':
        whereTareas.estado = { [Op.in]: ['Pendiente', 'Asignada'] };
        break;
      case 'En progreso':
        whereTareas.estado = { [Op.or]: ['En progreso', 'En Progreso'] }; // Por si acaso
        break;
      case 'Completadas':
        whereTareas.estado = 'Completada';
        break;
      case 'Verificadas':
        whereTareas.estado = 'Verificada';
        break;
      case 'Canceladas':
        whereTareas.estado = 'Cancelada';
        break;
    }
  }

  const offset = (page - 1) * limit;

  // 3. Consulta a la BD
  const { rows, count } = await models.Tarea.findAndCountAll({
    where: whereTareas,
    include: [
       { model: models.TipoActividad, attributes: ["codigo", "nombre"] },
       // IMPORTANTE: Incluir el modelo Lote para que salga el nombre en la tabla
       { model: models.Lote, attributes: ["id", "nombre"] }, 
       { 
          model: models.TareaAsignacion,
          // IMPORTANTE: Traer al Usuario para sacar sus nombres
          include: [{ model: models.Usuario, attributes: ["id", "nombres", "apellidos"] }] 
       }
    ],
    order: [["fecha_programada", "ASC"]],
    limit,
    offset,
  });

  // 4. Mapeo DTO (AQUÍ ESTABA EL ERROR)
  const tareasDTO = rows.map((t) => {
     const j = t.toJSON();
     
     // 👇 Lógica corregida para extraer asignados
     const asignadosFormateados = (j.TareaAsignacions || []).map((asignacion) => {
        const u = asignacion.Usuario;
        // Si existe usuario, unimos nombres. Si no, devolvemos un fallback.
        const nombreCompleto = u ? `${u.nombres} ${u.apellidos}` : 'Usuario Desconocido';
        
        return {
            id: u ? u.id : asignacion.id,
            nombreCompleto: nombreCompleto,
            rol: asignacion.rol_en_tarea // Opcional
        };
     });

     return { 
        id: j.id, 
        tipo: j.TipoActividad?.nombre || j.tipo_codigo, // Fallback si no hay relación
        titulo: j.titulo, 
        lote: j.Lote?.nombre, // Para la columna "Lote"
        estado: j.estado,
        fecha_programada: j.fecha_programada,
        asignados: asignadosFormateados // ✅ Pasamos el array lleno
     }; 
  });

  return {
    ...loteJson,
    tareas: {
      rows: tareasDTO,
      count,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(count / limit)),
    },
    resumenTareas 
  };
};


exports.cambiarEstadoLote = async (id) => {
  const l = await models.Lote.findByPk(id);
  if (!l) throw badRequest("Lote no encontrado");

  const nuevoEstado = l.estado === "Activo" ? "Inactivo" : "Activo";
  l.estado = nuevoEstado;
  await l.save();

  if (nuevoEstado === "Inactivo") {
    await notifs.crearParaRoles(["Propietario", "Tecnico"], {
      tipo: "General",
      titulo: "Lote deshabilitado",
      mensaje: `El lote "${l.nombre}" fue marcado como Inactivo.`,
      referencia: { lote_id: l.id, finca_id: l.finca_id },
      prioridad: "Alerta",
    });
  } else {
    await notifs.crearParaRoles(["Propietario", "Tecnico"], {
      tipo: "General",
      titulo: "Lote habilitado",
      mensaje: `El lote "${l.nombre}" fue marcado como Activo.`,
      referencia: { lote_id: l.id, finca_id: l.finca_id },
      prioridad: "Info", // o "Normal" si usas ese nivel
    });
  }

  return l.toJSON();
};




exports.editarLote = async (id, data) => {
  const l = await models.Lote.findByPk(id);
  if (!l) {
    const e = new Error("Lote no encontrado");
    e.status = 404;
    throw e;
  }

  const fields = ["nombre", "superficie_ha", "numero_plantas", "fecha_siembra", "estado"];

  // Snapshot antes
  const antes = {};
  for (const f of fields) antes[f] = l[f];

  // Aplicar cambios
  for (const f of fields) if (f in data) l[f] = data[f];

  try {
    await l.save();

    // Detectar cambios reales
    const cambios = fields.filter((f) => antes[f] !== l[f]);

    if (cambios.length > 0) {
      const listaCambios = cambios
        .map((f) => {
          const etiqueta =
            ({
              nombre: "Nombre",
              superficie_ha: "Superficie (ha)",
              numero_plantas: "N° Plantas",
              fecha_siembra: "Fecha de siembra",
              estado: "Estado",
            }[f] || f);

          return `${etiqueta}: "${antes[f] ?? "-"}" → "${l[f] ?? "-"}"`;
        })
        .join(" | ");

      await notifs.crearParaRoles(["Propietario", "Tecnico"], {
        tipo: "General",
        titulo: "Lote actualizado",
        mensaje: `Se modificó la información del lote "${l.nombre}". ${listaCambios}`,
        referencia: { lote_id: l.id, finca_id: l.finca_id },
        prioridad: "Info", // ajusta si tu enum no tiene Info
      });
    }

    return l.toJSON();
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      err.status = 409;
      err.code = "DUPLICATE";
      err.message = "El nombre de lote ya existe";
    }
    throw err;
  }
};
