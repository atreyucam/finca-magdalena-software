const { Op } = require("sequelize");
const { models, sequelize } = require("../../db");
const invService = require("../inventario/inventario.service");
const notif = require("../notificaciones/notificaciones.service");

function badRequest(msg = "Solicitud inválida") {
    const e = new Error(msg);
    e.status = 400;
    e.code = "BAD_REQUEST";
    return e;
}
function forbidden(msg = "Prohibido") {
    const e = new Error(msg);
    e.status = 403;
    e.code = "FORBIDDEN";
    return e;
}
function notFound(msg = "No encontrado") {
    const e = new Error(msg);
    e.status = 404;
    e.code = "NOT_FOUND";
    return e;
}
function emitTarea(io, tareaId, type, payload = {}) {
  if (!io) return;
  io.emit("tareas:update"); // refresca listados
  io.to(`tarea:${tareaId}`).emit(`tarea:${type}`, { tareaId, ...payload });
}
async function logTareaEvento({ tarea, estado = tarea.estado, usuarioId, comentario }) {
  return models.TareaEstado.create({
    tarea_id: tarea.id,
    estado,
    usuario_id: usuarioId,
    comentario,
    fecha: new Date(),
  });
}


// ==================
// Servicios de Tareas
// ==================
exports.crearTarea = async (currentUser, data, io) => {
  if (!["Propietario", "Tecnico"].includes(currentUser.role)) throw forbidden();

  const {
    titulo,

    fecha_programada,
    lote_id,
    cosecha_id,
    periodo_id,
    tipo_codigo,
    tipo_id,
    descripcion,
    asignados = [],
    detalle = {},
  } = data;

  if (!lote_id || !fecha_programada || (!tipo_id && !tipo_codigo) || !cosecha_id) {
    throw badRequest("tipo, lote, fecha_programada y cosecha_id son obligatorios");
  }

  // ---------- Resolver tipo (por id o por código) ----------
  let tipoId = tipo_id;
  let tipoNombre = null;

  // Siempre normalizamos el código a minúsculas y sin espacios
  let tipoCodigo = (tipo_codigo || "").trim().toLowerCase();

  // Si NO viene tipo_id pero sí tipo_codigo → buscar por código (en minúsculas)
  if (!tipoId && tipoCodigo) {
    const tipo = await models.TipoActividad.findOne({
      where: { codigo: tipoCodigo }, // 👈 en la BD están en minúsculas
    });
    if (!tipo) throw badRequest("tipo_codigo inválido");

    tipoId = tipo.id;
    tipoNombre = tipo.nombre || tipo.codigo || null;
    tipoCodigo = (tipo.codigo || tipoCodigo).toLowerCase(); // reforzamos
  }

  // Si viene tipo_id, completar nombre/código desde la BD
  if (tipoId && !tipoNombre) {
    const t = await models.TipoActividad.findByPk(tipoId, {
      attributes: ["nombre", "codigo"],
    });
    if (!t) throw badRequest("tipo_id inválido");

    tipoNombre = t.nombre || t.codigo || null;
    if (!tipoCodigo) {
      tipoCodigo = (t.codigo || "").toLowerCase();
    }
  }

  // Seguridad extra: si aún así no tenemos código, algo está mal
  if (!tipoCodigo) {
    throw badRequest("No se pudo resolver tipo_codigo de la actividad");
  }

  // ---------- Validar cosecha y periodo ----------
  const cosecha = await models.Cosecha.findByPk(cosecha_id);
  if (!cosecha || cosecha.estado !== "Activa") {
    throw badRequest("cosecha_id inválido o no activa");
  }

  let periodoId = periodo_id || null;
  if (periodoId) {
    const periodo = await models.PeriodoCosecha.findOne({
      where: { id: periodoId, cosecha_id },
    });
    if (!periodo) {
      throw badRequest("periodo_id inválido o no pertenece a la cosecha");
    }
  }

  const fechaProg = new Date(fecha_programada);
  if (isNaN(fechaProg.getTime())) {
    throw badRequest("fecha_programada inválida");
  }

  const tituloFinal = (titulo && String(titulo).trim()) || tipoNombre || "Tarea";

  // ---------- Crear tarea base (pendiente por defecto) ----------
  const tarea = await models.Tarea.create({
    titulo: tituloFinal,
    tipo_id: tipoId,
    lote_id,
    fecha_programada: fechaProg,
    descripcion: descripcion || null,
    creador_id: currentUser.sub,
    cosecha_id,
    periodo_id: periodoId,
    estado: "Pendiente",
  });

  // ---------- Detalle 1:1 según tipo de actividad ----------
  switch (tipoCodigo) {
    case "poda": {
  const {
    tipo,
    porcentaje_plantas_plan_pct,
    herramientas_desinfectadas,
  } = detalle || {};

  if (!tipo) {
    throw badRequest("PODA: 'tipo' es obligatorio (Formacion/Produccion/Sanitaria)");
  }

  await models.TareaPoda.create({
    tarea_id: tarea.id,
    tipo,
    porcentaje_plantas_plan_pct: porcentaje_plantas_plan_pct ?? null,
    porcentaje_plantas_real_pct: null, // se llena en completar
    herramientas_desinfectadas:
      typeof herramientas_desinfectadas === "boolean"
        ? herramientas_desinfectadas
        : true, // por defecto True (BPA)
  });
  break;
}


case "maleza": {
  const {
    metodo,
    // legacy:
    cobertura_estimada_pct,
    // nuevo nombre:
    cobertura_planificada_pct,
  } = detalle || {};

  if (!metodo) {
    throw badRequest(
      "MALEZA: 'metodo' es obligatorio (Manual/Mecanico/Quimico)"
    );
  }

  const planPct =
    cobertura_planificada_pct ?? cobertura_estimada_pct ?? null;

  await models.TareaManejoMaleza.create({
    tarea_id: tarea.id,
    metodo,
    cobertura_planificada_pct: planPct,
    cobertura_real_pct: null,
  });
  break;
}

    case "nutricion": {
  const { metodo_aplicacion, porcentaje_plantas_plan_pct } = detalle || {};
  if (!metodo_aplicacion) {
    throw badRequest("NUTRICION: 'metodo_aplicacion' es obligatorio");
  }

  await models.TareaNutricion.create({
    tarea_id: tarea.id,
    metodo_aplicacion,
    porcentaje_plantas_plan_pct: porcentaje_plantas_plan_pct ?? null,
    porcentaje_plantas_real_pct: null,
  });
  break;
}


    case "fitosanitario": {
  const {
    plaga_enfermedad,
    conteo_umbral,
    periodo_carencia_dias,
    fecha_hora_inicio,
    fecha_hora_fin,
    volumen_aplicacion_lt,
    equipo_aplicacion,
    porcentaje_plantas_plan_pct,
  } = detalle || {};

  if (!plaga_enfermedad) {
    throw badRequest("FITOSANITARIO: 'plaga_enfermedad' es obligatorio");
  }
  if (periodo_carencia_dias == null) {
    throw badRequest("FITOSANITARIO: 'periodo_carencia_dias' es obligatorio");
  }

  await models.TareaFitosanitaria.create({
    tarea_id: tarea.id,
    plaga_enfermedad,
    conteo_umbral: conteo_umbral || null,
    periodo_carencia_dias,
    fecha_hora_inicio: fecha_hora_inicio || fechaProg,
    fecha_hora_fin: fecha_hora_fin || fechaProg,
    volumen_aplicacion_lt: volumen_aplicacion_lt ?? null,
    equipo_aplicacion: equipo_aplicacion || null,
    porcentaje_plantas_plan_pct: porcentaje_plantas_plan_pct ?? null,
    porcentaje_plantas_real_pct: null,
  });
  break;
}



case "enfundado": {
  const { porcentaje_frutos_plan_pct } = detalle || {};

  await models.TareaEnfundado.create({
    tarea_id: tarea.id,
    porcentaje_frutos_plan_pct: porcentaje_frutos_plan_pct ?? null,
    porcentaje_frutos_real_pct: null,
  });
  break;
}


    case "cosecha": {
      const { kg_planificados } = detalle || {};

      const fechaCosecha = fechaProg.toISOString().slice(0, 10); // YYYY-MM-DD
      const codigo = `CO-${fechaCosecha}-L${lote_id}`;

      await models.TareaCosecha.create({
        codigo,
        cosecha_id,
        lote_id,
        periodo_id: periodoId || null,
        tarea_id: tarea.id,
        fecha_cosecha: fechaCosecha,
        kg_planificados: kg_planificados ?? null,
        kg_cosechados: 0,
        grado_madurez: null,
        notas: descripcion || null,
      });
      break;
    }

    default:
      // otros tipos sin detalle
      break;
  }

  // ---------- Estado inicial: siempre registramos "Pendiente" al crear ----------
  await models.TareaEstado.create({
    tarea_id: tarea.id,
    estado: "Pendiente",
    usuario_id: currentUser.sub,
    comentario: `Se ha creado la tarea #${tarea.id}.`,
  });

  // ---------- Asignaciones iniciales (si vienen) ----------
  if (Array.isArray(asignados) && asignados.length > 0) {
    const asignables = await models.Usuario.findAll({
      where: { id: { [Op.in]: asignados }, estado: "Activo" },
      attributes: ["id"],
      raw: true,
    });

    const foundIds = asignables.map((u) => Number(u.id));
    const requested = asignados.map(Number);
    const missing = requested.filter((id) => !foundIds.includes(id));

    if (missing.length) {
      throw badRequest(`Usuarios inválidos o inactivos: ${missing.join(",")}`);
    }

    const bulk = requested.map((uid) => ({
      tarea_id: tarea.id,
      usuario_id: uid,
      rol_en_tarea: "Ejecutor",
      asignado_por_id: currentUser.sub,
    }));

    await models.TareaAsignacion.bulkCreate(bulk, { ignoreDuplicates: true });

    // Actualizamos estado a "Asignada"
    tarea.estado = "Asignada";
    await tarea.save();

    await models.TareaEstado.create({
      tarea_id: tarea.id,
      estado: "Asignada",
      usuario_id: currentUser.sub,
      comentario: "Asignación inicial",
    });

    // Notificaciones (no bloqueamos si falla)
    for (const uid of requested) {
      notif
        .crear(uid, {
          tipo: "Tarea",
          titulo: "Nueva tarea asignada",
          mensaje: `Tarea #${tarea.id} asignada para el ${tarea.fecha_programada}`,
          referencia: { tarea_id: tarea.id },
          prioridad: "Info",
        })
        .catch(() => {});
    }
  }

  // ---------- Evento en tiempo real ----------
  if (io) io.emit("tareas:update");

  // Devuelve la tarea ya enriquecida con includes
  return await exports.obtenerTarea(currentUser, tarea.id);
};



exports.asignarUsuarios = async (currentUser, tareaId, body, io) => {
    if (!["Propietario", "Tecnico"].includes(currentUser.role))
        throw forbidden();
    const { usuarios = [], rol_en_tarea = "Ejecutor" } = body || {};
    if (!Array.isArray(usuarios) || usuarios.length === 0)
        throw badRequest("usuarios es requerido");

    const tarea = await models.Tarea.findByPk(tareaId);
    if (!tarea) throw notFound("Tarea no existe");
    if (["Completada", "Verificada", "Cancelada"].includes(tarea.estado))
        throw badRequest("No se puede asignar una tarea cerrada");

    // Validar usuarios activos (normalizando BIGINT string -> number)
    const asignables = await models.Usuario.findAll({
        where: { id: { [Op.in]: usuarios }, estado: "Activo" },
        attributes: ["id"],
        raw: true,
    });

    const foundIds = asignables.map((u) => Number(u.id));
    const requested = usuarios.map(Number);
    const missing = requested.filter((id) => !foundIds.includes(id));

    if (missing.length) {
        throw badRequest(
            `Usuarios inválidos o inactivos: ${missing.join(",")}`
        );
    }

    // Upsert asignaciones (evita duplicados por unique idx)
    const bulk = usuarios.map((uid) => ({
        tarea_id: tareaId,
        usuario_id: uid,
        rol_en_tarea,
        asignado_por_id: currentUser.sub,
    }));
    await models.TareaAsignacion.bulkCreate(bulk, { ignoreDuplicates: true });

    // Si pasa de Pendiente a Asignada
    if (tarea.estado === "Pendiente") {
        tarea.estado = "Asignada";
        await tarea.save();
        await models.TareaEstado.create({
            tarea_id: tarea.id,
            estado: "Asignada",
            usuario_id: currentUser.sub,
            comentario: "Asignación",
        });
    }

    for (const uid of usuarios) {
        try {
            await notif.crear(uid, {
                tipo: "Tarea",
                titulo: "Nueva tarea asignada",
                mensaje: `Tarea #${tareaId} asignada para el ${tarea.fecha_programada}`,
                referencia: { tarea_id: tareaId },
                prioridad: "Info",
            });
        } catch (e) {
            console.error("Notif asignación falló", { uid, tareaId, e });
        }
    }
    if (io) io.emit("tareas:update");
    return await exports.obtenerTarea(currentUser, tareaId);
};


exports.iniciarTarea = async (currentUser, tareaId, comentario, io) => {
  const tarea = await models.Tarea.findByPk(tareaId);
  if (!tarea) throw notFound("Tarea no existe");
  if (["Verificada", "Cancelada"].includes(tarea.estado)) {
    throw badRequest("La tarea ya fue cerrada");
  }

  // Validaciones de rol (igual que antes)
  if (currentUser.role === "Trabajador") {
    const asign = await models.TareaAsignacion.findOne({
      where: { tarea_id: tareaId, usuario_id: currentUser.sub },
    });
    if (!asign) throw forbidden("Solo los asignados pueden iniciar la tarea");
  } else if (currentUser.role === "Propietario") {
    throw forbidden("El propietario no inicia tareas");
  }

  // Si ya está en progreso, solo devolvemos el detalle
  if (tarea.estado === "En progreso") {
    return await exports.obtenerTarea(currentUser, tareaId);
  }
  if (tarea.estado === "Completada") {
    throw badRequest("La tarea ya fue marcada como Completada");
  }

  await sequelize.transaction(async (t) => {
    // 🔹 Nuevo: fecha/hora de inicio real (solo si no tenía)
    if (!tarea.fecha_inicio_real) {
      tarea.fecha_inicio_real = new Date();
    }

    tarea.estado = "En progreso";
    await tarea.save({ transaction: t });

    await models.TareaEstado.create({
      tarea_id: tarea.id,
      estado: "En progreso",
      usuario_id: currentUser.sub,
      comentario: comentario || null,
      fecha: new Date(),
    }, { transaction: t });
  });

  await notif.crearParaRoles(["Tecnico"], {
    tipo: "Tarea",
    titulo: "Tarea en progreso",
    mensaje: `La tarea #${tareaId} fue marcada como En Progreso`,
    referencia: { tarea_id: tareaId },
    prioridad: "Info",
  }).catch(() => {});

  if (io) {
    io.emit("tareas:update");
    io.emit("tarea:estado", { tareaId, estado: "En progreso" });
  }

  return await exports.obtenerTarea(currentUser, tareaId);
};



exports.completarTarea = async (currentUser, tareaId, body, io) => {
  const tarea = await models.Tarea.findByPk(tareaId, {
    include: [{ model: models.TipoActividad, attributes: ["codigo"] }],
  });
  if (!tarea) throw notFound("Tarea no existe");
  if (["Verificada","Cancelada"].includes(tarea.estado))
    throw badRequest("La tarea ya fue cerrada");

  if (currentUser.role === "Trabajador") {
    const asign = await models.TareaAsignacion.findOne({
      where: { tarea_id: tareaId, usuario_id: currentUser.sub },
    });
    if (!asign) throw forbidden("Solo los asignados pueden completar la tarea");
  } else if (currentUser.role === "Propietario") {
    throw forbidden("El propietario no completa tareas");
  }

  const comentario =
    typeof body === "string"
      ? body
      : body?.comentario || null;

  const itemsReal = Array.isArray(body?.items) ? body.items : [];
  const detalleReal = body && typeof body === "object" ? body.detalle || {} : {};
  const tipoCodigo = tarea.TipoActividad?.codigo || "";

  await sequelize.transaction(async (t) => {
    // 1) Actualizar cantidades reales de items (tu código actual)
    if (itemsReal.length) {
      const byId = new Map(itemsReal.filter(x => x.id).map(x => [x.id, x]));
      const byItem = new Map(itemsReal.filter(x => x.item_id && !x.id).map(x => [x.item_id, x]));

      const tareaItems = await models.TareaItem.findAll({
        where: { tarea_id: tareaId },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      for (const ti of tareaItems) {
        const src = byId.get(ti.id) || byItem.get(ti.item_id);
        if (src && src.cantidad_real != null) {
          ti.cantidad_real = Number(src.cantidad_real);
          await ti.save({ transaction: t });
        }
      }
    }

    // ==============================================================================
    // TAREAS
    // 2) Actualizar métricas reales específicas por tipo (tu código, con los ifs por tipo)
    if (tipoCodigo === "poda") {
      const { porcentaje_plantas_real_pct, herramientas_desinfectadas } = detalleReal;

      const det = await models.TareaPoda.findOne({
        where: { tarea_id: tareaId },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (det) {
        if (porcentaje_plantas_real_pct != null) {
          det.porcentaje_plantas_real_pct = Number(porcentaje_plantas_real_pct);
        }
        if (typeof herramientas_desinfectadas === "boolean") {
          det.herramientas_desinfectadas = herramientas_desinfectadas;
        }
        await det.save({ transaction: t });
      }
    }

    //------------------------------------------
    if (tipoCodigo === "maleza") {
      const { cobertura_real_pct } = detalleReal;

      const det = await models.TareaManejoMaleza.findOne({
        where: { tarea_id: tareaId },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (det && cobertura_real_pct != null) {
        det.cobertura_real_pct = Number(cobertura_real_pct);
        await det.save({ transaction: t });
      }
    }

    //------------------------------------------
    if (tipoCodigo === "enfundado") {
      const { porcentaje_frutos_real_pct } = detalleReal;
      const det = await models.TareaEnfundado.findOne({
        where: { tarea_id: tareaId },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (det && porcentaje_frutos_real_pct != null) {
        det.porcentaje_frutos_real_pct = Number(porcentaje_frutos_real_pct);
        await det.save({ transaction: t });
      }
    }

    //------------------------------------------
    if (tipoCodigo === "nutricion") {
      const { porcentaje_plantas_real_pct } = detalleReal;
      const det = await models.TareaNutricion.findOne({
        where: { tarea_id: tareaId },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (det && porcentaje_plantas_real_pct != null) {
        det.porcentaje_plantas_real_pct = Number(porcentaje_plantas_real_pct);
        await det.save({ transaction: t });
      }
    }

    //------------------------------------------
    if (tipoCodigo === "fitosanitario") {
      const { porcentaje_plantas_real_pct } = detalleReal;
      const det = await models.TareaFitosanitaria.findOne({
        where: { tarea_id: tareaId },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (det && porcentaje_plantas_real_pct != null) {
        det.porcentaje_plantas_real_pct = Number(porcentaje_plantas_real_pct);
        await det.save({ transaction: t });
      }
    }

    //------------------------------------------
        if (tipoCodigo === "cosecha") {
      const {
        fecha_cosecha,
        kg_cosechados,
        grado_madurez,
        notas,
      } = detalleReal;

      const det = await models.TareaCosecha.findOne({
        where: { tarea_id: tareaId },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (det) {
        // fecha real de cosecha (si viene)
        if (fecha_cosecha) {
          const f =
            typeof fecha_cosecha === "string"
              ? fecha_cosecha.slice(0, 10)
              : new Date(fecha_cosecha).toISOString().slice(0, 10);
          det.fecha_cosecha = f;
        }

        // kg cosechados reales
        if (kg_cosechados != null) {
          det.kg_cosechados = Number(kg_cosechados);
        }

        // grado de madurez (opcional)
        if (grado_madurez != null) {
          det.grado_madurez = Number(grado_madurez);
        }

        // notas reales (si manda, sobrescribe la descripción planificada)
        if (notas != null) {
          det.notas = notas;
        }

        await det.save({ transaction: t });
      }
    }


    // 3) 🔹 NUEVO: marcar fin real y duración
    const ahora = new Date();

    if (!tarea.fecha_inicio_real) {
      // fallback por si nunca llamaron a /iniciar
      tarea.fecha_inicio_real = ahora;
    }

    tarea.fecha_fin_real = ahora;

    const diffMs = tarea.fecha_fin_real - tarea.fecha_inicio_real;
    const duracionMin = Math.max(1, Math.round(diffMs / 60000)); // mínimo 1 min
    tarea.duracion_real_min = duracionMin;

    // 4) Estado de la tarea
    if (tarea.estado !== "Completada") {
      tarea.estado = "Completada";
      await tarea.save({ transaction: t });

      await models.TareaEstado.create({
        tarea_id: tarea.id,
        estado: "Completada",
        usuario_id: currentUser.sub,
        comentario,
        fecha: new Date(),
      }, { transaction: t });
    }
  });

  await notif.crearParaRoles(["Tecnico"], {
    tipo: "Tarea",
    titulo: "Tarea completada",
    mensaje: `La tarea #${tareaId} fue marcada como Completada`,
    referencia: { tarea_id: tareaId },
    prioridad: "Info",
  }).catch(() => {});

  if (io) io.emit("tareas:update");

  return await exports.obtenerTarea(currentUser, tareaId);
};



exports.verificarTarea = async (currentUser, tareaId, body, io) => {
  if (currentUser.role !== "Tecnico" && currentUser.role !== "Propietario") {
    throw forbidden("Solo Técnico o Propietario pueden verificar");
  }

  const comentario =
    typeof body === "string"
      ? body
      : body?.comentario || null;

  const force =
    typeof body === "object" ? !!body.force : false;

  const tarea = await models.Tarea.findByPk(tareaId, {
    include: [{ model: models.TipoActividad, attributes: ["codigo"] }],
  });
  if (!tarea) throw notFound("Tarea no existe");
  if (tarea.estado !== "Completada")
    throw badRequest("Para verificar, la tarea debe estar Completada");

  const tipoCodigo = tarea.TipoActividad?.codigo || "";

  const yaHayConsumo = await models.InventarioMovimiento.findOne({
    where: { referencia: { [Op.contains]: { tarea_id: tareaId } } },
  });

  await sequelize.transaction(async (t) => {
    // (1) Consumo de insumos basado en tarea_items
    if (!yaHayConsumo) {
      const items = await models.TareaItem.findAll({
        where: { tarea_id: tareaId },
        include: [models.InventarioItem],
        transaction: t,
        // lock: t.LOCK.UPDATE,
      });

      for (const ti of items) {
        if (ti.categoria !== "Insumo") continue;
        const item = ti.InventarioItem;
        if (!item) continue;

        const usar = Number(
          ti.cantidad_real && ti.cantidad_real > 0
            ? ti.cantidad_real
            : ti.cantidad_planificada || 0
        );
        if (!(usar > 0)) continue;

        try {
          await invService._moverStock({
            t,
            item,
            tipo: "SALIDA",
            cantidad: usar,
            unidad_id: ti.unidad_id,
            motivo: "Consumo por verificación de tarea",
            referencia: {
              tarea_id: tareaId,
              lote_id: tarea.lote_id,
              tipo_id: tarea.tipo_id,
            },
          });
        } catch (err) {
          if (err.code === "LOW_STOCK" && !force) {
            throw badRequest(
              `Stock insuficiente para ${item.nombre}. Usa force=true para confirmar.`
            );
          }
          if (err.code === "LOW_STOCK" && force) {
            const factor = await invService._getFactor(
              ti.unidad_id,
              item.unidad_id
            );
            const cantBase = usar * factor;

            const itemLocked = await models.InventarioItem.findByPk(item.id, {
              transaction: t,
              lock: t.LOCK.UPDATE,
            });
            const nuevo = Number(itemLocked.stock_actual) - cantBase;
            itemLocked.stock_actual = nuevo.toFixed(3);
            await itemLocked.save({ transaction: t });

            await models.InventarioMovimiento.create(
              {
                item_id: item.id,
                tipo: "SALIDA",
                cantidad: usar,
                unidad_id: ti.unidad_id,
                factor_a_unidad_base: factor,
                cantidad_en_base: cantBase.toFixed(3),
                stock_resultante: itemLocked.stock_actual,
                motivo: "Consumo (forzado) por verificación de tarea",
                referencia: {
                  tarea_id: tareaId,
                  lote_id: tarea.lote_id,
                  tipo_id: tarea.tipo_id,
                  forced: true,
                },
              },
              { transaction: t }
            );
          } else {
            throw err;
          }
        }
      }
    }

    // (2) Reservas → Consumidas
    await models.InventarioReserva.update(
      { estado: "Consumida" },
      { where: { tarea_id: tareaId, estado: "Reservada" }, transaction: t }
    );


        // (3) COSECHA: normalizar a TareaCosecha + Clasificación + Rechazos
    if (tipoCodigo === "cosecha") {
  const ind = typeof body === "object" ? body.indicadores : null;
  if (!ind || !ind.operacion || typeof ind.operacion.kgCosechados !== "number") {
    throw badRequest("COSECHA: falta operacion.kgCosechados en indicadores");
  }

  const N = (v) => Number(v ?? 0);
  const round3 = (x) => Math.round(N(x) * 1000) / 1000;
  const safeStr = (s) =>
    String(s ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const kgCosechados = N(ind.operacion.kgCosechados);
  if (!(kgCosechados > 0)) {
    throw badRequest("COSECHA: kgCosechados debe ser > 0");
  }

  const exp = ind.clasificacion?.exportacion || {};
  const nac = ind.clasificacion?.nacional || {};

  const kgExp =
    typeof exp.kgEstimados === "number"
      ? N(exp.kgEstimados)
      : N(exp.gabetas) * N(exp.pesoPromGabetaKg || 0);

  const kgNac =
    typeof nac.kgEstimados === "number"
      ? N(nac.kgEstimados)
      : N(nac.gabetas) * N(nac.pesoPromGabetaKg || 0);

  const rechList = Array.isArray(ind.rechazo?.detalle)
    ? ind.rechazo.detalle
    : [];
  const kgRech = rechList.reduce((acc, r) => acc + N(r.kg), 0);

  if (round3(kgExp + kgNac + kgRech) !== round3(kgCosechados)) {
    throw badRequest(
      `COSECHA: no cierra masa. exp(${kgExp}) + nac(${kgNac}) + rech(${kgRech}) != ${kgCosechados}`
    );
  }

  const f = ind.operacion.fechaCosecha || tarea.fecha_programada || new Date();
  const fecha_cosecha =
    typeof f === "string"
      ? f.slice(0, 10)
      : new Date(f).toISOString().slice(0, 10);

  const codigo = `CO-${fecha_cosecha}-L${tarea.lote_id}`;
  const notas = comentario || tarea.descripcion || null;

  // 🔍 Buscar TareaCosecha existente
  let tc = await models.TareaCosecha.findOne({
    where: { tarea_id: tarea.id },
    transaction: t,
    lock: t.LOCK.UPDATE,
  });

  // fallback por código para datos antiguos (si los hubiera)
  if (!tc) {
    tc = await models.TareaCosecha.findOne({
      where: { codigo },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
  }

  if (tc) {
    Object.assign(tc, {
      codigo,
      cosecha_id: tarea.cosecha_id,
      lote_id: tarea.lote_id,
      periodo_id: tarea.periodo_id || null,
      fecha_cosecha,
      kg_cosechados: round3(kgCosechados),
      notas,
    });

    // 👇 ya NO guardamos porcentaje_cumplimiento_pct aquí
    await tc.save({ transaction: t });
  } else {
    tc = await models.TareaCosecha.create(
      {
        codigo,
        cosecha_id: tarea.cosecha_id,
        lote_id: tarea.lote_id,
        periodo_id: tarea.periodo_id || null,
        tarea_id: tarea.id,
        fecha_cosecha,
        kg_cosechados: round3(kgCosechados),
        notas,
      },
      { transaction: t }
    );
  }

  // 🔹 Clasificación
  await models.TareaCosechaClasificacion.destroy({
    where: { tarea_cosecha_id: tc.id },
    transaction: t,
  });

  await models.TareaCosechaClasificacion.bulkCreate(
    [
      {
        tarea_cosecha_id: tc.id,
        destino: kgExp > 0 ? "Exportacion" : null,
        gabetas: exp.gabetas || 0,
        peso_promedio_gabeta_kg: exp.pesoPromGabetaKg || null,
        kg: round3(kgExp),
      },
      {
        tarea_cosecha_id: tc.id,
        destino: kgNac > 0 ? "Nacional" : null,
        gabetas: nac.gabetas || 0,
        peso_promedio_gabeta_kg: nac.pesoPromGabetaKg || null,
        kg: round3(kgNac),
      },
    ],
    { transaction: t }
  );

  // 🔹 Rechazos
  await models.TareaCosechaRechazo.destroy({
    where: { tarea_cosecha_id: tc.id },
    transaction: t,
  });

  if (rechList.length) {
    const mapCausa = (s) => {
      const x = safeStr(s);
      if (x.includes("mecan")) return "DanoMecanico";
      if (x.includes("plag") || x.includes("enferm")) return "Plaga";
      if (x.includes("calib")) return "Calibre";
      if (x.includes("manip")) return "Manipulacion";
      return "Otro";
    };

    await models.TareaCosechaRechazo.bulkCreate(
      rechList.map((r) => ({
        tarea_cosecha_id: tc.id,
        causa: mapCausa(r.causa),
        kg: round3(N(r.kg)),
        observacion: r.observacion || null,
      })),
      { transaction: t }
    );
  }
}




    // (4) Estado → Verificada
    tarea.estado = "Verificada";
    await tarea.save({ transaction: t });

    await models.TareaEstado.create({
      tarea_id: tarea.id,
      estado: "Verificada",
      usuario_id: currentUser.sub,
      comentario,
      fecha: new Date(),
    }, { transaction: t });
  });

  const asigns = await models.TareaAsignacion.findAll({ where: { tarea_id: tareaId } });
  for (const a of asigns) {
    await notif.crear(a.usuario_id, {
      tipo: "Tarea",
      titulo: "Tarea verificada",
      mensaje: `La tarea #${tareaId} fue verificada`,
      referencia: { tarea_id: tareaId },
      prioridad: "Info",
    }).catch(() => {});
  }

  if (io) io.emit("tareas:update");
  return await exports.obtenerTarea(currentUser, tareaId);
};



exports.crearNovedad = async (currentUser, tareaId, body, io) => {
  const { texto } = body || {};
  if (!texto) throw badRequest("texto es obligatorio");

  const tarea = await models.Tarea.findByPk(tareaId);
  if (!tarea) throw notFound("Tarea no existe");

  // Permisos
  if (currentUser.role === "Trabajador") {
    const asign = await models.TareaAsignacion.findOne({
      where: { tarea_id: tareaId, usuario_id: currentUser.sub },
    });
    if (!asign) throw forbidden("Solo asignados pueden registrar novedades");
  }

  // Crear novedad
  const nov = await models.Novedad.create({
    tarea_id: tareaId,
    autor_id: currentUser.sub,
    texto,
  });

  // Log línea de tiempo con estado actual
  const estadoLog = await logTareaEvento({
    tarea,
    usuarioId: currentUser.sub,
    comentario: `Se ha registrado una novedad en la tarea #${tareaId}`,
  });

 // 🔊 emitir: lista + room de la tarea
  emitTarea(io, tareaId, "novedad", {
    novedad: {
      id: nov.id,
      texto: nov.texto,
      created_at: nov.created_at,
      autor: { id: currentUser.sub },
    },
    estado: {
      estado: estadoLog.estado,
      fecha: estadoLog.fecha,
      comentario: estadoLog.comentario,
      usuario_id: estadoLog.usuario_id,
    },
  });
  // 👉 EMISIÓN DIRECTA AL ROOM DE ESA TAREA
if (io) {
  io.to(`tarea:${tareaId}`).emit("tarea:novedad", {
    tareaId,
    novedad: {
      id: nov.id,
      texto: nov.texto,
      created_at: nov.created_at,
      autor: { id: currentUser.sub },
    },
    estado: {
      estado: estadoLog.estado,
      fecha: estadoLog.fecha,
      comentario: estadoLog.comentario,
      usuario_id: estadoLog.usuario_id,
    },
  });
}

  return nov.toJSON();
};



exports.listarNovedades = async (currentUser, tareaId) => {
    const tarea = await models.Tarea.findByPk(tareaId);
    if (!tarea) throw notFound("Tarea no existe");
    // Trabajador solo si asignado
    if (currentUser.role === "Trabajador") {
        const asign = await models.TareaAsignacion.findOne({
            where: { tarea_id: tareaId, usuario_id: currentUser.sub },
        });
        if (!asign) throw forbidden();
    }
    const list = await models.Novedad.findAll({
        where: { tarea_id: tareaId },
        order: [["created_at", "ASC"]],
        include: [
            {
                model: models.Usuario,
                attributes: ["id", "nombres", "apellidos"],
            },
        ],
    });
    return list.map((n) => ({
        id: n.id,
        texto: n.texto,
        created_at: n.created_at,
        autor: n.Usuario
            ? {
                  id: n.Usuario.id,
                  nombre: `${n.Usuario.nombres} ${n.Usuario.apellidos}`,
              }
            : null,
    }));
};

exports.listarTareas = async (
  currentUser,
  { lote_id, estado, desde, hasta, asignadoA }
) => {
  const where = {};

  if (lote_id) where.lote_id = lote_id;
  if (estado) where.estado = estado;
  if (desde && hasta) where.fecha_programada = { [Op.between]: [desde, hasta] };
  else if (desde) where.fecha_programada = { [Op.gte]: desde };
  else if (hasta) where.fecha_programada = { [Op.lte]: hasta };

  const include = [
    { model: models.TipoActividad, attributes: ["codigo", "nombre"] },
    { model: models.Lote, attributes: ["nombre"] },
    {
      model: models.Cosecha,
      attributes: ["id", "nombre", "numero", "anio_agricola", "estado"],
    },
    {
      model: models.PeriodoCosecha,
      attributes: ["id", "nombre"],
    },
    {
      model: models.TareaAsignacion,
      required: currentUser.role === "Trabajador" || !!asignadoA,
      where:
        currentUser.role === "Trabajador"
          ? { usuario_id: currentUser.sub }
          : asignadoA
          ? { usuario_id: asignadoA }
          : undefined,
      include: [
        {
          model: models.Usuario,
          attributes: ["id", "nombres", "apellidos"],
        },
      ],
    },
  ];

  // 🔥 Consulta pura: sin paginación, sin count de Sequelize
  const tareas = await models.Tarea.findAll({
    where,
    include,
    order: [
      ["fecha_programada", "DESC"],
      ["id", "DESC"],
    ],
  });

  return {
    total: tareas.length, // ahora esto coincide con lo que ves en data
    data: tareas.map((t) => ({
      id: t.id,
      tipo: t.TipoActividad?.nombre,
      tipo_codigo: t.TipoActividad?.codigo,
      titulo: t.titulo,
      lote: t.Lote?.nombre,
      lote_id: t.lote_id,
      creada: t.created_at,
      fecha_programada: t.fecha_programada,
      estado: t.estado,
      detalles: t.detalles,
      asignados: (t.TareaAsignacions || []).map((a) => ({
        id: a.Usuario?.id,
        nombreCompleto: `${a.Usuario?.nombres} ${a.Usuario?.apellidos}`,
      })),
      cosecha: t.Cosecha?.nombre,
      periodo: t.PeriodoCosecha?.nombre,
    })),
  };
};




exports.obtenerTarea = async (currentUser, id) => {
  const tarea = await models.Tarea.findByPk(id, {
    include: [
      { 
        model: models.TipoActividad, 
        attributes: ["codigo", "nombre"] 
      },
      { 
        model: models.Lote, 
        attributes: ["id", "nombre"] 
      },
      {
        model: models.TareaAsignacion,
        include: [
          { 
            model: models.Usuario, 
            attributes: ["id", "nombres", "apellidos"] 
          },
        ],
      },
      {
        model: models.TareaEstado,
        include: [
          { 
            model: models.Usuario, 
            attributes: ["id", "nombres", "apellidos"] 
          },
        ],
      },
      {
        model: models.Novedad,
        include: [
          { 
            model: models.Usuario, 
            attributes: ["id", "nombres", "apellidos"] 
          },
        ],
      },
      {
        model: models.Usuario,
        as: "Creador",
        attributes: ["id", "nombres", "apellidos"],
      },
      { 
        model: models.Cosecha, 
        attributes: ["id", "nombre", "numero", "anio_agricola", "estado"] 
      },
      { 
        model: models.PeriodoCosecha, 
        attributes: ["id", "nombre"] 
      },
      {
        model: models.TareaItem,
        include: [
          { 
            model: models.InventarioItem, 
            attributes: ["id", "nombre", "categoria", "unidad_id"] 
          },
          { 
            model: models.Unidad, 
            attributes: ["codigo"] 
          },
        ],
      },

      // 🔹 Detalles por tipo de actividad
      { model: models.TareaPoda },
      { model: models.TareaManejoMaleza },
      { model: models.TareaNutricion },
      { model: models.TareaFitosanitaria },
      { model: models.TareaEnfundado },
      {
        model: models.TareaCosecha,
        include: [
          models.TareaCosechaClasificacion,
          models.TareaCosechaRechazo,
        ],
      },
    ],
  });

  if (!tarea) return null;

  // 🔒 Trabajador solo puede ver tareas donde está asignado
  if (currentUser.role === "Trabajador") {
    const isAssigned = tarea.TareaAsignacions?.some(
      (a) => a.usuario_id === currentUser.sub
    );
    if (!isAssigned) throw forbidden();
  }

  return {
    // 🔹 Datos base de la tarea
    id: tarea.id,
    tipo: tarea.TipoActividad?.nombre,
    tipo_codigo: tarea.TipoActividad?.codigo,
    titulo: tarea.titulo,
    lote_id: tarea.lote_id,
    lote: tarea.Lote?.nombre,
    fecha_programada: tarea.fecha_programada,
    descripcion: tarea.descripcion,
    estado: tarea.estado,

// ⏱️ Tiempos reales  (CORRECTO)
fecha_hora_inicio_real: tarea.fecha_inicio_real,
fecha_hora_fin_real: tarea.fecha_fin_real,
duracion_real_min: tarea.duracion_real_min,


    // 👤 Creador
    creador: tarea.Creador
      ? {
          id: tarea.Creador.id,
          nombre: `${tarea.Creador.nombres} ${tarea.Creador.apellidos}`,
        }
      : null,

    // 👥 Asignaciones
    asignaciones: (tarea.TareaAsignacions || []).map((a) => ({
      id: a.id,
      usuario: a.Usuario
        ? {
            id: a.Usuario.id,
            nombre: `${a.Usuario.nombres} ${a.Usuario.apellidos}`,
          }
        : { id: a.usuario_id },
      rol_en_tarea: a.rol_en_tarea,
    })),

    // 🔁 Historial de estados
    estados: (tarea.TareaEstados || [])
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
      .map((e) => ({
        estado: e.estado,
        fecha: e.fecha,
        comentario: e.comentario,
        usuario: e.Usuario
          ? {
              id: e.Usuario.id,
              nombre: `${e.Usuario.nombres} ${e.Usuario.apellidos}`,
            }
          : null,
      })),

    // 📝 Novedades
    novedades: (tarea.Novedads || []).map((n) => ({
      id: n.id,
      texto: n.texto,
      created_at: n.created_at,
      autor: n.Usuario
        ? {
            id: n.Usuario.id,
            nombre: `${n.Usuario.nombres} ${n.Usuario.apellidos}`,
          }
        : null,
    })),

    // 🌱 Cosecha / periodo
    cosecha: tarea.Cosecha?.nombre,
    periodo: tarea.PeriodoCosecha?.nombre,

    // 📦 Items de inventario
    items: (tarea.TareaItems || [])
      .sort((a, b) => (a.idx || 0) - (b.idx || 0))
      .map((i) => ({
        id: i.id,
        item_id: i.item_id,
        nombre: i.InventarioItem?.nombre,
        categoria: i.categoria,
        unidad: i.Unidad?.codigo,
        cantidad_planificada: i.cantidad_planificada,
        cantidad_real: i.cantidad_real,
        idx: i.idx,
      })),

    // 🌿 Detalle PODA
    poda: tarea.TareaPoda
      ? {
          id: tarea.TareaPoda.id,
          tipo: tarea.TareaPoda.tipo,
          porcentaje_plantas_plan_pct:
            tarea.TareaPoda.porcentaje_plantas_plan_pct,
          porcentaje_plantas_real_pct:
            tarea.TareaPoda.porcentaje_plantas_real_pct,
          herramientas_desinfectadas:
            tarea.TareaPoda.herramientas_desinfectadas,
          fecha_hora_inicio: tarea.TareaPoda.fecha_hora_inicio,
          fecha_hora_fin: tarea.TareaPoda.fecha_hora_fin,
        }
      : null,

    // 🌾 Detalle MANEJO DE MALEZAS
    manejoMaleza: tarea.TareaManejoMaleza
      ? {
          id: tarea.TareaManejoMaleza.id,
          metodo: tarea.TareaManejoMaleza.metodo, // Manual | Quimico | Mecanico
          cobertura_planificada_pct:
            tarea.TareaManejoMaleza.cobertura_planificada_pct,
          cobertura_real_pct: tarea.TareaManejoMaleza.cobertura_real_pct,
          fecha_hora_inicio: tarea.TareaManejoMaleza.fecha_hora_inicio,
          fecha_hora_fin: tarea.TareaManejoMaleza.fecha_hora_fin,
        }
      : null,

    // 💧 Detalle NUTRICIÓN
    nutricion: tarea.TareaNutricion
      ? {
          id: tarea.TareaNutricion.id,
          metodo_aplicacion: tarea.TareaNutricion.metodo_aplicacion, // Drench | Foliar | Fertirriego | (otra opción extra)
          porcentaje_plantas_plan_pct:
            tarea.TareaNutricion.porcentaje_plantas_plan_pct,
          porcentaje_plantas_real_pct:
            tarea.TareaNutricion.porcentaje_plantas_real_pct,
          fecha_hora_inicio: tarea.TareaNutricion.fecha_hora_inicio,
          fecha_hora_fin: tarea.TareaNutricion.fecha_hora_fin,
        }
      : null,

    // 🐛 Detalle FITOSANITARIO
    fitosanitario: tarea.TareaFitosanitaria
      ? {
          id: tarea.TareaFitosanitaria.id,
          plaga_enfermedad: tarea.TareaFitosanitaria.plaga_enfermedad,
          conteo_umbral: tarea.TareaFitosanitaria.conteo_umbral,
          periodo_carencia_dias:
            tarea.TareaFitosanitaria.periodo_carencia_dias,
          fecha_hora_inicio: tarea.TareaFitosanitaria.fecha_hora_inicio,
          fecha_hora_fin: tarea.TareaFitosanitaria.fecha_hora_fin,
          volumen_aplicacion_lt:
            tarea.TareaFitosanitaria.volumen_aplicacion_lt,
          equipo_aplicacion: tarea.TareaFitosanitaria.equipo_aplicacion,
          porcentaje_plantas_plan_pct:
            tarea.TareaFitosanitaria.porcentaje_plantas_plan_pct,
          porcentaje_plantas_real_pct:
            tarea.TareaFitosanitaria.porcentaje_plantas_real_pct,
        }
      : null,

    // 🎒 Detalle ENFUNDADO
    enfundado: tarea.TareaEnfundado
      ? {
          id: tarea.TareaEnfundado.id,
          frutos_enfundados_plan: tarea.TareaEnfundado.frutos_enfundados_plan,
          frutos_enfundados_real: tarea.TareaEnfundado.frutos_enfundados_real,
          porcentaje_frutos_plan_pct:
            tarea.TareaEnfundado.porcentaje_frutos_plan_pct,
          porcentaje_frutos_real_pct:
            tarea.TareaEnfundado.porcentaje_frutos_real_pct,
          fecha_hora_inicio: tarea.TareaEnfundado.fecha_hora_inicio,
          fecha_hora_fin: tarea.TareaEnfundado.fecha_hora_fin,
        }
      : null,

    // 🍈 Detalle COSECHA / POSCOSECHA
    tareaCosecha: tarea.TareaCosecha
      ? {
          id: tarea.TareaCosecha.id,
          fecha_cosecha: tarea.TareaCosecha.fecha_cosecha,
          kg_planificados: tarea.TareaCosecha.kg_planificados,
          kg_cosechados: tarea.TareaCosecha.kg_cosechados,
          grado_madurez: tarea.TareaCosecha.grado_madurez,
          notas: tarea.TareaCosecha.notas,

          clasificacion: (tarea.TareaCosecha.TareaCosechaClasificacions || []).map(
            (c) => ({
              id: c.id,
              destino: c.destino,
              gabetas: c.gabetas,
              peso_promedio_gabeta_kg: c.peso_promedio_gabeta_kg,
              kg: c.kg,
            })
          ),

          rechazos: (tarea.TareaCosecha.TareaCosechaRechazos || []).map(
            (r) => ({
              id: r.id,
              causa: r.causa,
              kg: r.kg,
              observacion: r.observacion,
            })
          ),
        }
      : null,
  };
};


exports.configurarItems = async (currentUser, tareaId, body, io) => {
  if (!["Propietario","Tecnico"].includes(currentUser.role)) throw forbidden();
  const { items = [] } = body || {};
  if (!Array.isArray(items)) throw badRequest("items debe ser un arreglo");

  const tarea = await models.Tarea.findByPk(tareaId);
  if (!tarea) throw notFound("Tarea no existe");
  if (["Completada","Verificada","Cancelada"].includes(tarea.estado))
    throw badRequest("No se puede modificar una tarea cerrada");

  const norm = [];

  for (let idx = 0; idx < items.length; idx++) {
    const it = items[idx];
    const { item_id, categoria, unidad_id, unidad_codigo, cantidad_planificada } = it || {};
    if (!item_id || !categoria || !cantidad_planificada || !(unidad_id || unidad_codigo)) {
      throw badRequest("item_id, categoria, unidad y cantidad_planificada son obligatorios");
    }

    const item = await models.InventarioItem.findByPk(item_id);
    if (!item) throw badRequest(`Ítem inválido: ${item_id}`);
    if (!["Insumo","Herramienta","Equipo"].includes(categoria)) {
      throw badRequest(`categoria inválida para item ${item.nombre}`);
    }

    const unidad = unidad_id
      ? await models.Unidad.findByPk(unidad_id)
      : await models.Unidad.findOne({ where: { codigo: unidad_codigo } });
    if (!unidad) throw badRequest("unidad inválida");

    let cantidad_en_base = 0;
    try {
      const factor = await invService._getFactor(unidad.id, item.unidad_id);
      cantidad_en_base = Number(cantidad_planificada) * factor;
    } catch (e) {
      throw badRequest(`Config unidades para ${item.nombre}: ${e.message}`);
    }

    norm.push({
      item,
      unidad,
      categoria,
      cantidad_planificada: Number(cantidad_planificada),
      cantidad_real: 0,
      cantidad_en_base,
      idx,
    });
  }

  await sequelize.transaction(async (t) => {
    // Limpia items previos
    await models.TareaItem.destroy({ where: { tarea_id: tareaId }, transaction: t });

    // Crea nuevos
    await models.TareaItem.bulkCreate(
      norm.map(n => ({
        tarea_id: tareaId,
        item_id: n.item.id,
        categoria: n.categoria,
        unidad_id: n.unidad.id,
        cantidad_planificada: n.cantidad_planificada,
        cantidad_real: n.cantidad_real,
        idx: n.idx,
      })), { transaction: t }
    );

    // Reservas: anulamos anteriores y recreamos SOLO para insumos
    await models.InventarioReserva.update(
      { estado: "Anulada" },
      { where: { tarea_id: tareaId, estado: "Reservada" }, transaction: t }
    );

    const reservas = norm
      .filter(n => n.categoria === "Insumo")
      .map(n => ({
        tarea_id: tareaId,
        item_id: n.item.id,
        cantidad_en_base: n.cantidad_en_base,
        estado: "Reservada",
        fecha: new Date(),
      }));

    if (reservas.length) {
      await models.InventarioReserva.bulkCreate(reservas, { transaction: t });
    }

    await models.TareaEstado.create({
      tarea_id: tareaId,
      estado: tarea.estado,
      usuario_id: currentUser.sub,
      comentario: `Se han configurado ${norm.length} ítems para la tarea #${tareaId}.`,
      fecha: new Date(),
    }, { transaction: t });
  });

  emitTarea(io, tareaId, "items");
  if (io) io.emit("inventario:update");

  return await exports.obtenerTarea(currentUser, tareaId);
};

exports.listarItems = async (currentUser, tareaId) => {
  const tarea = await models.Tarea.findByPk(tareaId);
  if (!tarea) throw notFound("Tarea no existe");

  if (currentUser.role === "Trabajador") {
    const asign = await models.TareaAsignacion.findOne({
      where: { tarea_id: tareaId, usuario_id: currentUser.sub },
    });
    if (!asign) throw forbidden();
  }

  const list = await models.TareaItem.findAll({
    where: { tarea_id: tareaId },
    include: [
      { model: models.InventarioItem, attributes: ["nombre","categoria","unidad_id"] },
      { model: models.Unidad, attributes: ["codigo"] },
    ],
    order: [["idx","ASC"],["id","ASC"]],
  });

  return list.map(i => ({
    id: i.id,
    item_id: i.item_id,
    nombre: i.InventarioItem?.nombre,
    categoria: i.categoria,
    unidad: i.Unidad?.codigo,
    cantidad_planificada: i.cantidad_planificada,
    cantidad_real: i.cantidad_real,
    idx: i.idx,
  }));
};


// service
exports.actualizarAsignaciones = async (currentUser, tareaId, body, io) => {
  const { usuarios = [] } = body || {};
  if (!Array.isArray(usuarios)) throw badRequest("usuarios debe ser un arreglo");

  const tarea = await models.Tarea.findByPk(tareaId, {
    include: [{ model: models.TareaAsignacion, include: [models.Usuario] }],
  });
  if (!tarea) throw notFound("Tarea no existe");
  if (!["Propietario", "Tecnico"].includes(currentUser.role)) throw forbidden();
  if (["Completada", "Verificada", "Cancelada"].includes(tarea.estado))
    throw badRequest("No se puede editar una tarea cerrada");

  // normalizar SIEMPRE a Number (evita string vs number)
  const requested = [...new Set(usuarios.map(Number))];

  const actuales = (tarea.TareaAsignacions || []).map(a => Number(a.usuario_id));

  // validar usuarios activos
  const asignables = await models.Usuario.findAll({
    where: { id: { [Op.in]: requested }, estado: "Activo" },
    attributes: ["id", "nombres", "apellidos"],
    raw: true,
  });
  const foundIds = asignables.map(u => Number(u.id));
  const missing = requested.filter(id => !foundIds.includes(id));
  if (missing.length)
    throw badRequest(`Usuarios inválidos o inactivos: ${missing.join(",")}`);

  // diffs
  const aAgregar = requested.filter(id => !actuales.includes(id));
  const aEliminar = actuales.filter(id => !requested.includes(id));

  // aplicar cambios
  if (aEliminar.length) {
    await models.TareaAsignacion.destroy({
      where: { tarea_id: tareaId, usuario_id: aEliminar },
    });
  }
  if (aAgregar.length) {
    const bulk = aAgregar.map(uid => ({
      tarea_id: tareaId,
      usuario_id: uid,
      rol_en_tarea: "Ejecutor",
      asignado_por_id: currentUser.sub,
    }));
    await models.TareaAsignacion.bulkCreate(bulk, { ignoreDuplicates: true });
  }

  // helpers para mensajes
  const nombre = u => `${u.nombres} ${u.apellidos}`.trim();
  const formatList = (arr) =>
    arr.length <= 1 ? arr.join("") : `${arr.slice(0, -1).join(", ")} y ${arr[arr.length - 1]}`;

  // actividad: eliminados
  if (aEliminar.length) {
    const us = await models.Usuario.findAll({
      where: { id: { [Op.in]: aEliminar } },
      attributes: ["nombres", "apellidos"],
    });
    const lista = formatList(us.map(nombre));
    await models.TareaEstado.create({
      tarea_id: tareaId,
      estado: tarea.estado,
      usuario_id: currentUser.sub,
      comentario: `${aEliminar.length === 1 ? "Se ha eliminado a" : "Se han eliminado a"} ${lista} de la tarea #${tareaId}.`,
    });
  }

  // actividad: agregados
  if (aAgregar.length) {
    const us = await models.Usuario.findAll({
      where: { id: { [Op.in]: aAgregar } },
      attributes: ["nombres", "apellidos"],
    });
    const lista = formatList(us.map(nombre));
    await models.TareaEstado.create({
      tarea_id: tareaId,
      estado: tarea.estado === "Pendiente" ? "Asignada" : tarea.estado,
      usuario_id: currentUser.sub,
      comentario: `${aAgregar.length === 1 ? "Se ha asignado a" : "Se han asignado a"} ${lista} a la tarea #${tareaId}.`,
    });

    // si estaba Pendiente, pasar a Asignada
    if (tarea.estado === "Pendiente") {
      tarea.estado = "Asignada";
      await tarea.save();
    }
  }

  if (io) io.emit("tareas:update");
  return await exports.obtenerTarea(currentUser, tareaId);
};

exports.cancelarTarea = async (currentUser, tareaId, body = {}, io) => {
  // 1. Verificación de rol
  if (!["Propietario", "Tecnico"].includes(currentUser.role)) {
    throw forbidden(); // 403
  }

  const { comentario } = body;

  await sequelize.transaction(async (t) => {
    // 2. Buscar tarea con sus reservas de inventario
    const tarea = await models.Tarea.findByPk(tareaId, {
      include: [models.InventarioReserva],
      transaction: t,
      // lock: t.LOCK.UPDATE, // opcional, puedes quitarlo si no quieres lock
    });

    // 👇 reemplazo del assertFound
    if (!tarea) throw notFound("Tarea no encontrada");

    // 3. Validar estado permitido
    if (!["Pendiente", "Asignada", "En progreso"].includes(tarea.estado)) {
      throw badRequest(
        "Solo se pueden cancelar tareas pendientes, asignadas o en progreso"
      );
    }

    // 4. (Opcional pero muy lógico) Anular reservas de inventario asociadas
    await models.InventarioReserva.update(
      { estado: "Anulada" },
      { where: { tarea_id: tarea.id, estado: "Reservada" }, transaction: t }
    );

    // 5. Actualizar estado de la tarea
    tarea.estado = "Cancelada";
    await tarea.save({ transaction: t });

    // 6. Registrar en historial de estado
    await models.TareaEstado.create(
      {
        tarea_id: tarea.id,
        estado: "Cancelada",
        usuario_id: currentUser.sub,        // 👈 coherente con el resto
        comentario: comentario || "Tarea cancelada",
        fecha: new Date(),
      },
      { transaction: t }
    );
  });

  // 7. Notificar por sockets (fuera de la tx)
  if (io) {
    io.emit("tareas:update");
    io.emit("tarea:estado", { tareaId, estado: "Cancelada" });
  }

  // 8. Devuelves la tarea enriquecida, igual que en otros servicios
  return await exports.obtenerTarea(currentUser, tareaId);
};



// 🔹 NUEVO: resumen por estado / por grupo
exports.resumenTareas = async (
  currentUser,
  { lote_id, desde, hasta, asignadoA }
) => {
  const where = {};

  // Filtros básicos (mismos que listarTareas)
  if (lote_id) where.lote_id = lote_id;
  if (desde && hasta) where.fecha_programada = { [Op.between]: [desde, hasta] };
  else if (desde) where.fecha_programada = { [Op.gte]: desde };
  else if (hasta) where.fecha_programada = { [Op.lte]: hasta };

  // Misma lógica de include / permisos que listarTareas
  const include = [
    { model: models.TipoActividad, attributes: ["codigo", "nombre"] },
    { model: models.Lote, attributes: ["nombre"] },
    {
      model: models.Cosecha,
      attributes: ["id", "nombre", "numero", "anio_agricola", "estado"],
    },
    {
      model: models.PeriodoCosecha,
      attributes: ["id", "nombre"],
    },
    {
      model: models.TareaAsignacion,
      required: currentUser.role === "Trabajador" || !!asignadoA,
      where:
        currentUser.role === "Trabajador"
          ? { usuario_id: currentUser.sub }
          : asignadoA
          ? { usuario_id: asignadoA }
          : undefined,
    },
  ];

  const tareas = await models.Tarea.findAll({
    where,
    include,
  });

  const porEstado = {};
  const porGrupo = {
    Pendientes: 0,
    "En progreso": 0,
    Completadas: 0,
    Verificadas: 0,
    Canceladas: 0,
  };

  const acumularGrupo = (estado) => {
    switch (estado) {
      case "Pendiente":
      case "Asignada":
        porGrupo.Pendientes++;
        break;
      case "En progreso":
        porGrupo["En progreso"]++;
        break;
      case "Completada":
        porGrupo.Completadas++;
        break;
      case "Verificada":
        porGrupo.Verificadas++;
        break;
      case "Cancelada":
        porGrupo.Canceladas++;
        break;
      default:
        break;
    }
  };

  for (const t of tareas) {
    const e = t.estado || "Pendiente";
    porEstado[e] = (porEstado[e] || 0) + 1;
    acumularGrupo(e);
  }

  return {
    total: tareas.length,
    porEstado,
    porGrupo,   // 👈 esto nos sirve directo para las cards
  };
};




exports.actualizarCosecha = async (tareaId, payload) => {
  const {
    grado_madurez,
    notas,
    clasificacion = [],
    rechazos = [],
  } = payload || {};

  return sequelize.transaction(async (t) => {
    // 1) Verificar que la tarea existe
    const tarea = await models.Tarea.findByPk(tareaId, { transaction: t });
    if (!tarea) throw notFound("Tarea no encontrada");

    // 2) Buscar el detalle de cosecha asociado
    let tareaCosecha = await models.TareaCosecha.findOne({
      where: { tarea_id: tarea.id },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    // Si no hay registro de cosecha → de facto no es tarea de cosecha
    if (!tareaCosecha) {
      throw badRequest(
        "La tarea no tiene detalle de cosecha asociado (no es de tipo cosecha)."
      );
    }

    // 3) Actualizar campos simples
    if (grado_madurez !== undefined) {
      tareaCosecha.grado_madurez = grado_madurez;
    }
    if (notas !== undefined) {
      tareaCosecha.notas = notas;
    }

    await tareaCosecha.save({ transaction: t });

    // 4) Reemplazar CLASIFICACIÓN
    if (Array.isArray(clasificacion)) {
      await models.TareaCosechaClasificacion.destroy({
        where: { tarea_cosecha_id: tareaCosecha.id },
        transaction: t,
      });

      const rowsClas = clasificacion
        .filter(
          (c) =>
            c &&
            (c.destino || c.gabetas || c.kg || c.peso_promedio_gabeta_kg)
        )
        .map((c) => ({
          tarea_cosecha_id: tareaCosecha.id,
          destino: c.destino || null,
          gabetas: Number(c.gabetas) || 0,
          peso_promedio_gabeta_kg:
            c.peso_promedio_gabeta_kg !== undefined &&
            c.peso_promedio_gabeta_kg !== null &&
            c.peso_promedio_gabeta_kg !== ""
              ? Number(c.peso_promedio_gabeta_kg)
              : null,
          kg: Number(c.kg) || 0,
        }));

      if (rowsClas.length > 0) {
        await models.TareaCosechaClasificacion.bulkCreate(rowsClas, {
          transaction: t,
        });
      }
    }

    // 5) Reemplazar RECHAZOS
    if (Array.isArray(rechazos)) {
      await models.TareaCosechaRechazo.destroy({
        where: { tarea_cosecha_id: tareaCosecha.id },
        transaction: t,
      });

      const rowsRech = rechazos
        .filter((r) => r && r.causa && r.kg !== undefined && r.kg !== null)
        .map((r) => ({
          tarea_cosecha_id: tareaCosecha.id,
          causa: r.causa, // 'DanoMecanico', 'Plaga', etc.
          kg: Number(r.kg) || 0,
          observacion: r.observacion || null,
        }));

      if (rowsRech.length > 0) {
        await models.TareaCosechaRechazo.bulkCreate(rowsRech, {
          transaction: t,
        });
      }
    }

    // 6) Recargar con relaciones (usando los alias que tengas definidos)
    const tareaCosechaUpdated = await models.TareaCosecha.findByPk(
      tareaCosecha.id,
      {
        include: [
          {
            model: models.TareaCosechaClasificacion,
          },
          {
            model: models.TareaCosechaRechazo,
          },
        ],
        transaction: t,
      }
    );

    return {
      ok: true,
      tareaCosecha: tareaCosechaUpdated,
    };
  });
};
