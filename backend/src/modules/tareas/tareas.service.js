const { Op } = require("sequelize");
const { models, sequelize } = require("../../db");
const invService = require("../inventario/inventario.service");
const notif = require("../notificaciones/notificaciones.service");
const {
  validateIndicadores,
  buildResumen,
  resumenKey,
} = require('./indicadores.helper');

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
    if (!["Propietario", "Tecnico"].includes(currentUser.role))
        throw forbidden();

    const {
        titulo,
        tipo_codigo,
        tipo_id,
        lote_id,
        fecha_programada,
        descripcion,
        detalles,
        cosecha_id,
        periodo_id,
        asignados = [],  // 👈 agregado
    } = data;

    if (
        !lote_id ||
        !fecha_programada ||
        (!tipo_id && !tipo_codigo) ||
        !cosecha_id
    ) {
        throw badRequest(
            "tipo, lote, fecha_programada y cosecha_id son obligatorios"
        );
    }

   // ✅ definir tipoId y preparar nombre
  let tipoId = tipo_id;
  let tipoNombre = null;

  // Resolver por código si no viene id
  if (!tipoId && tipo_codigo) {
    const tipo = await models.TipoActividad.findOne({ where: { codigo: tipo_codigo } });
    if (!tipo) throw badRequest("tipo_codigo inválido");
    tipoId = tipo.id;
    tipoNombre = tipo.nombre || tipo.codigo || null;
  }

  // Si vino id pero no tenemos nombre, lo buscamos para el título
  if (tipoId && !tipoNombre) {
    const t = await models.TipoActividad.findByPk(tipoId, { attributes: ["nombre", "codigo"] });
    tipoNombre = t?.nombre || t?.codigo || null;
  }





    // Validar cosecha
    const cosecha = await models.Cosecha.findByPk(cosecha_id);
    if (!cosecha || cosecha.estado !== "Activa")
        throw badRequest("cosecha_id inválido o no activa");

    // Validar periodo (opcional)
    let periodoId = periodo_id;
    if (periodoId) {
        const periodo = await models.PeriodoCosecha.findOne({
            where: { id: periodoId, cosecha_id },
        });
        if (!periodo)
            throw badRequest("periodo_id inválido o no pertenece a la cosecha");
    }



    // Normalizar fecha programada a Date (acepta string ISO local/UTC)
  const fechaProg = new Date(fecha_programada);
  if (isNaN(fechaProg.getTime())) throw badRequest("fecha_programada inválida");

  // 👇 fallback del título
  const tituloFinal = (titulo && String(titulo).trim()) || tipoNombre || "Tarea";

    // Crear tarea
    const tarea = await models.Tarea.create({
        titulo: tituloFinal,
        tipo_id: tipoId,
        lote_id,
        fecha_programada: fechaProg,
        descripcion: descripcion || null,
        creador_id: currentUser.sub,
        detalles: detalles || {},
        cosecha_id,
        periodo_id: periodoId || null,
        estado: "Pendiente",
    });

    await models.TareaEstado.create({
        tarea_id: tarea.id,
        estado: "Pendiente",
        usuario_id: currentUser.sub,
        comentario: `Se ha creado la tarea #${tarea.id}.`,
    });

    // 👇 Nueva parte: asignar usuarios directamente si vienen en el body
    if (Array.isArray(asignados) && asignados.length > 0) {
        // Validar usuarios activos
        const asignables = await models.Usuario.findAll({
            where: { id: { [Op.in]: asignados }, estado: "Activo" },
            attributes: ["id"],
            raw: true,
        });

        const foundIds = asignables.map((u) => Number(u.id));
        const requested = asignados.map(Number);
        const missing = requested.filter((id) => !foundIds.includes(id));

        if (missing.length) {
            throw badRequest(
                `Usuarios inválidos o inactivos: ${missing.join(",")}`
            );
        }

        // Guardar asignaciones
        const bulk = asignados.map((uid) => ({
            tarea_id: tarea.id,
            usuario_id: uid,
            rol_en_tarea: "Ejecutor",
            asignado_por_id: currentUser.sub,
        }));
        await models.TareaAsignacion.bulkCreate(bulk, { ignoreDuplicates: true });

        // Actualizar estado si estaba pendiente
        if (tarea.estado === "Pendiente") {
            tarea.estado = "Asignada";
            await tarea.save();
            await models.TareaEstado.create({
                tarea_id: tarea.id,
                estado: "Asignada",
                usuario_id: currentUser.sub,
                comentario: "Asignación inicial",
            });
        }

        // Notificar a cada usuario
        for (const uid of asignados) {
            try {
                await notif.crear(uid, {
                    tipo: "Tarea",
                    titulo: "Nueva tarea asignada",
                    mensaje: `Tarea #${tarea.id} asignada para el ${tarea.fecha_programada}`,
                    referencia: { tarea_id: tarea.id },
                    prioridad: "Info",
                });
            } catch (e) {
                console.error("Notif asignación falló", { uid, tareaId: tarea.id, e });
            }
        }
    }

    // 🔥 Emitir evento en tiempo real
    if (io) io.emit("tareas:update");

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

// ...imports habituales:


// NUEVO: iniciarTarea
exports.iniciarTarea = async (currentUser, tareaId, comentario, io) => {
  const tarea = await models.Tarea.findByPk(tareaId);
  if (!tarea) throw notFound("Tarea no existe");

  // Estados terminales no permiten iniciar
  if (["Verificada", "Cancelada"].includes(tarea.estado)) {
    throw badRequest("La tarea ya fue cerrada");
  }

  // Permisos
  if (currentUser.role === "Trabajador") {
    const asign = await models.TareaAsignacion.findOne({
      where: { tarea_id: tareaId, usuario_id: currentUser.sub },
    });
    if (!asign) throw forbidden("Solo los asignados pueden iniciar la tarea");
  } else if (currentUser.role === "Propietario") {
    throw forbidden("El propietario no inicia tareas");
  }

  // Idempotencia: si ya está EnProgreso, solo devolvemos
  if (tarea.estado === "En progreso") {
    return await exports.obtenerTarea(currentUser, tareaId);
  }

  // Si ya está Completada, no puede “iniciarse”
  if (tarea.estado === "Completada") {
    throw badRequest("La tarea ya fue marcada como Completada");
  }

  await sequelize.transaction(async (t) => {
    tarea.estado = "En progreso";
    await tarea.save({ transaction: t });

    await models.TareaEstado.create(
      {
        tarea_id: tarea.id,
        estado: "En progreso",
        usuario_id: currentUser.sub,
        comentario: comentario || null,
      },
      { transaction: t }
    );
  });

  // Notificación a Técnicos (ajústalo a tu gusto)
  await notif.crearParaRoles(["Tecnico"], {
    tipo: "Tarea",
    titulo: "Tarea en progreso",
    mensaje: `La tarea #${tareaId} fue marcada como En Progreso`,
    referencia: { tarea_id: tareaId },
    prioridad: "Info",
  });

  // Broadcast realtime
  if (io) {
    io.emit("tareas:update");
    io.emit("tarea:estado", { tareaId, estado: "En progreso" });
  }

  return await exports.obtenerTarea(currentUser, tareaId);
};



// backend/src/modules/tareas/tareas.service.js (fragmento dentro de completarTarea)


exports.completarTarea = async (currentUser, tareaId, comentario, io) => {
  const tarea = await models.Tarea.findByPk(tareaId, {
    include: [{ model: models.TipoActividad, attributes: ['codigo'] }],
  });
  if (!tarea) throw notFound("Tarea no existe");
  if (["Verificada","Cancelada"].includes(tarea.estado)) throw badRequest("La tarea ya fue cerrada");

  // Permisos (como ya lo tienes)...
  if (currentUser.role === "Trabajador") {
    const asign = await models.TareaAsignacion.findOne({
      where: { tarea_id: tareaId, usuario_id: currentUser.sub },
    });
    if (!asign) throw forbidden("Solo los asignados pueden completar la tarea");
  } else if (currentUser.role === "Propietario") {
    throw forbidden("El propietario no completa tareas");
  }

  // === Indicadores: si el tipo aplica (no cosecha) valida y guarda en JSONB
  const tipoCodigo = tarea.TipoActividad?.codigo;
try {
  const rawIndicadores = typeof comentario === "object" ? comentario?.indicadores : undefined;
  const parsed = validateIndicadores(tipoCodigo, rawIndicadores);

  if (parsed) {
    // ✅ Agrega resumen y clave según tipo (poda, malezas, nutrición, etc.)
    const resumen = buildResumen(tipoCodigo, parsed);
    const key = resumenKey(tipoCodigo); // ej: 'resumen_poda'

    const nuevosDetalles = { ...(tarea.detalles || {}), indicadores: parsed };
    if (key && resumen) nuevosDetalles[key] = resumen;

    tarea.detalles = nuevosDetalles;
    await tarea.save();
  }
} catch (zerr) {
  const e = badRequest(`Indicadores inválidos para ${tipoCodigo}: ${zerr.message}`);
  e.code = "BAD_INDICADORES";
  throw e;
}

  // === tu lógica existente para cambiar estado a 'Completada' y log TareaEstado:
  if (tarea.estado === "Completada") return await exports.obtenerTarea(currentUser, tareaId);

  await sequelize.transaction(async (t) => {
    tarea.estado = "Completada";
    await tarea.save({ transaction: t });

    await models.TareaEstado.create({
      tarea_id: tarea.id,
      estado: "Completada",
      usuario_id: currentUser.sub,
      comentario: (typeof comentario === 'string') ? comentario : (comentario?.comentario || null),
    }, { transaction: t });
  });

  // Notificaciones, sockets, etc...
  await notif.crearParaRoles(["Tecnico"], {
    tipo: "Tarea",
    titulo: "Tarea completada",
    mensaje: `La tarea #${tareaId} fue marcada como Completada`,
    referencia: { tarea_id: tareaId },
    prioridad: "Info",
  });
  if (io) io.emit("tareas:update");
  return await exports.obtenerTarea(currentUser, tareaId);
};


// ======================================================================
// Verificar tarea (solo Técnico) + consumo de insumos (idempotente) + indicadores
// ======================================================================
exports.verificarTarea = async (currentUser, tareaId, comentarioOrBody, io) => {
  // permitir { comentario, force, indicadores } o string
  const comentario =
    typeof comentarioOrBody === "string"
      ? comentarioOrBody
      : comentarioOrBody?.comentario || null;

  const force =
    typeof comentarioOrBody === "object" ? !!comentarioOrBody.force : false;

  // -------- permisos básicos --------
  if (currentUser.role !== "Tecnico") {
    throw forbidden("Solo el técnico puede verificar");
  }

  // traemos también el TipoActividad para no queryear dos veces
  const tarea = await models.Tarea.findByPk(tareaId, {
    include: [{ model: models.TipoActividad, attributes: ["codigo"] }],
  });
  if (!tarea) throw notFound("Tarea no existe");
  if (tarea.estado !== "Completada") {
    throw badRequest("Para verificar, la tarea debe estar Completada");
  }

  // idempotencia: ¿ya hay consumo?
  const yaHayConsumo = await models.InventarioMovimiento.findOne({
    where: { referencia: { [Op.contains]: { tarea_id: tareaId } } },
  });

  await sequelize.transaction(async (t) => {
    // ============================
    // (1) Consumo de insumos (si aún no se hizo)
    // ============================
    if (!yaHayConsumo) {
      const insumos = await models.TareaInsumo.findAll({
        where: { tarea_id: tareaId },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      for (const x of insumos) {
        const item = await models.InventarioItem.findByPk(x.item_id, {
          transaction: t,
          lock: t.LOCK.UPDATE,
        });

        try {
          await invService._moverStock({
            t,
            item,
            tipo: "SALIDA",
            cantidad: x.cantidad,
            unidad_id: x.unidad_id,
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
            // Forzar salida (delta directo en base)
            const factor = await invService._getFactor(
              x.unidad_id,
              item.unidad_id
            );
            const cantBase = Number(x.cantidad) * factor;

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
                cantidad: x.cantidad,
                unidad_id: x.unidad_id,
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

    // ============================
    // (2) Marcar reservas como consumidas
    // ============================
    await models.InventarioReserva.update(
      { estado: "Consumida" },
      { where: { tarea_id: tareaId, estado: "Reservada" }, transaction: t }
    );

    // ============================
    // (2.3) Indicadores (NO COSECHA): revalidar y dejar resumen
    // ============================
    const tipoCodigo = tarea.TipoActividad?.codigo; // p.ej. PODA, MALEZAS, NUTRICION, FITOSANITARIA, ENFUNDADO, COSECHA

    if (tipoCodigo && tipoCodigo !== "COSECHA") {
      try {
        // indicadores pueden venir en el body o estar ya guardados en detalles
        const incoming =
          typeof comentarioOrBody === "object"
            ? comentarioOrBody?.indicadores
            : undefined;
        const raw = incoming || tarea.detalles?.indicadores;
        const parsed = validateIndicadores(tipoCodigo, raw); // si no aplica schema, devuelve null

        if (parsed) {
          const resumen = buildResumen(tipoCodigo, parsed);
          const key = resumenKey(tipoCodigo);

          const nuevosDetalles = { ...(tarea.detalles || {}), indicadores: parsed };
          if (key && resumen) nuevosDetalles[key] = resumen;

          tarea.detalles = nuevosDetalles;
          await tarea.save({ transaction: t });
        }
      } catch (zerr) {
        const e = badRequest(
          `Indicadores inválidos para ${tipoCodigo}: ${zerr.message}`
        );
        e.code = "BAD_INDICADORES";
        throw e;
      }
    }

    // ============================
    // (2.5) COSECHA: normalización a tablas (si aplica)
    // ============================
    if (tipoCodigo === "COSECHA") {
      // indicadores desde body o JSONB
      const inBody =
        typeof comentarioOrBody === "object"
          ? comentarioOrBody?.indicadores
          : undefined;
      const ind = inBody || tarea.detalles?.indicadores;
      if (!ind || !ind.operacion || typeof ind.operacion.kgCosechados !== "number") {
        throw badRequest(
          "COSECHA: indicadores inválidos. Falta operacion.kgCosechados (number)."
        );
      }

      // Helpers
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

      // Clasificación → Exportación / Nacional
      const exp = ind.clasificacion?.exportacion || {};
      const nac = ind.clasificacion?.nacional || {};

      const kgExp =
        typeof exp.kgEstimados === "number"
          ? N(exp.kgEstimados)
          : typeof exp.gabetas === "number" &&
            typeof exp.pesoPromGabetaKg === "number"
          ? N(exp.gabetas) * N(exp.pesoPromGabetaKg)
          : 0;

      const kgNac =
        typeof nac.kgEstimados === "number"
          ? N(nac.kgEstimados)
          : typeof nac.gabetas === "number" &&
            typeof nac.pesoPromGabetaKg === "number"
          ? N(nac.gabetas) * N(nac.pesoPromGabetaKg)
          : 0;

      if (kgExp < 0 || kgNac < 0)
        throw badRequest("COSECHA: kg por destino no puede ser negativo");

      // Rechazos
      const rechList = Array.isArray(ind.rechazo?.detalle)
        ? ind.rechazo.detalle
        : [];
      const kgRech = rechList.reduce((acc, r) => acc + N(r.kg), 0);
      if (kgRech < 0) throw badRequest("COSECHA: rechazo (kg) no puede ser negativo");

      // Cierre de masa
      if (round3(kgExp + kgNac + kgRech) !== round3(kgCosechados)) {
        throw badRequest(
          `COSECHA: no cierra la masa. exp(${kgExp}) + nac(${kgNac}) + rech(${kgRech}) != kgCosechados(${kgCosechados})`
        );
      }

      // Fecha DATEONLY segura
      const f = ind.operacion.fechaCosecha ?? tarea.fecha_programada;
      const yyyy_mm_dd =
        typeof f === "string" ? f : new Date(f).toISOString().slice(0, 10);

      // Código único por lote y fecha
      const codigo = `CO-${yyyy_mm_dd}-L${tarea.lote_id}`;

      // Upsert LoteCosecha
      const notas =
        (typeof comentarioOrBody === "object"
          ? comentarioOrBody?.comentario
          : comentario) || tarea.descripcion || null;

      const lc = await models.LoteCosecha.findOne({
        where: { codigo },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      let loteCosechaId;
      if (lc) {
        Object.assign(lc, {
          cosecha_id: tarea.cosecha_id,
          lote_id: tarea.lote_id,
          periodo_id: tarea.periodo_id || null,
          tarea_id: tarea.id,
          fecha_cosecha: yyyy_mm_dd,
          kg_cosechados: round3(kgCosechados),
          notas,
        });
        await lc.save({ transaction: t });
        loteCosechaId = lc.id;
      } else {
        const nlc = await models.LoteCosecha.create(
          {
            codigo,
            cosecha_id: tarea.cosecha_id,
            lote_id: tarea.lote_id,
            periodo_id: tarea.periodo_id || null,
            tarea_id: tarea.id,
            fecha_cosecha: yyyy_mm_dd,
            kg_cosechados: round3(kgCosechados),
            notas,
          },
          { transaction: t }
        );
        loteCosechaId = nlc.id;
      }

      // Clasificaciones (Exportación y Nacional)
      await models.LoteCosechaClasificacion.destroy(
        { where: { lote_cosecha_id: loteCosechaId } },
        { transaction: t }
      );
      await models.LoteCosechaClasificacion.bulkCreate(
        [
          {
            lote_cosecha_id: loteCosechaId,
            destino: "Exportacion",
            gabetas: Math.max(0, parseInt(exp.gabetas ?? 0, 10)),
            peso_promedio_gabeta_kg:
              exp.pesoPromGabetaKg != null ? N(exp.pesoPromGabetaKg) : null,
            kg_estimados: round3(kgExp),
          },
          {
            lote_cosecha_id: loteCosechaId,
            destino: "Nacional",
            gabetas: Math.max(0, parseInt(nac.gabetas ?? 0, 10)),
            peso_promedio_gabeta_kg:
              nac.pesoPromGabetaKg != null ? N(nac.pesoPromGabetaKg) : null,
            kg_estimados: round3(kgNac),
          },
        ],
        { transaction: t }
      );

      // Rechazos (detalle)
      await models.LoteCosechaRechazo.destroy(
        { where: { lote_cosecha_id: loteCosechaId } },
        { transaction: t }
      );
      if (rechList.length) {
        const mapCausa = (s) => {
          const x = safeStr(s);
          if (x.includes("mecan")) return "DanoMecanico";
          if (x.includes("plag") || x.includes("antr")) return "Plaga";
          if (x.includes("calib")) return "Calibre";
          if (x.includes("manip")) return "Manipulacion";
          return "Otro";
        };
        const rows = rechList.map((r) => ({
          lote_cosecha_id: loteCosechaId,
          causa: mapCausa(r.causa),
          kg: round3(N(r.kg)),
          observacion: r.observacion || null,
        }));
        await models.LoteCosechaRechazo.bulkCreate(rows, { transaction: t });
      }

      // Poscosecha (opcional 1:1)
      const pos = ind.poscosecha || {};
      if (Object.keys(pos).length) {
        const payload = {
          lote_cosecha_id: loteCosechaId,
          cepillado: !!pos.cepillado,
          clasificacion: !!pos.clasificacion,
          tipo_contenedor: pos.tipoContenedor || "Gabeta plástica",
          capacidad_gabeta_kg:
            pos.capacidadGabetaKg != null ? N(pos.capacidadGabetaKg) : null,
          gabetas_llenas:
            pos.gabetasLlenas != null
              ? Math.max(0, parseInt(pos.gabetasLlenas, 10))
              : null,
        };
        const exists = await models.LoteCosechaPoscosecha.findOne({
          where: { lote_cosecha_id: loteCosechaId },
          transaction: t,
        });
        if (exists) {
          await models.LoteCosechaPoscosecha.update(payload, {
            where: { lote_cosecha_id: loteCosechaId },
            transaction: t,
          });
        } else {
          await models.LoteCosechaPoscosecha.create(payload, { transaction: t });
        }
      }

      // Resumen en tarea.detalles (fuente de verdad: tablas)
      const resumen = {
        lote_cosecha_id: loteCosechaId,
        kg_cosechados: round3(kgCosechados),
        exportacion: {
          gabetas: Math.max(0, parseInt(exp.gabetas ?? 0, 10)),
          kg: round3(kgExp),
        },
        nacional: {
          gabetas: Math.max(0, parseInt(nac.gabetas ?? 0, 10)),
          kg: round3(kgNac),
        },
        rechazo_kg: round3(kgRech),
      };
      tarea.detalles = { ...(tarea.detalles || {}), resumen_cosecha: resumen };
      await tarea.save({ transaction: t });
    }

    // ============================
    // (3) Cambiar estado y dejar traza (UN SOLO LUGAR)
    // ============================
    tarea.estado = "Verificada";
    await tarea.save({ transaction: t });

    await models.TareaEstado.create(
      {
        tarea_id: tarea.id,
        estado: "Verificada",
        usuario_id: currentUser.sub,
        comentario: comentario || null,
        fecha: new Date(),
      },
      { transaction: t }
    );
  });

  // -------- notificar asignados --------
  const asigns = await models.TareaAsignacion.findAll({
    where: { tarea_id: tareaId },
  });
  for (const a of asigns) {
    await notif.crear(a.usuario_id, {
      tipo: "Tarea",
      titulo: "Tarea verificada",
      mensaje: `La tarea #${tareaId} fue verificada por el técnico`,
      referencia: { tarea_id: tareaId },
      prioridad: "Info",
    });
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
  { lote_id, estado, desde, hasta, asignadoA, page = 1, pageSize = 20 }
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
    { model: models.Cosecha, attributes: ["id", "nombre", "numero", "anio_agricola", "estado"] },
    { model: models.PeriodoCosecha, attributes: ["id", "nombre", "semana_inicio", "semana_fin"] },
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

  const offset = (page - 1) * pageSize;
  const { rows, count } = await models.Tarea.findAndCountAll({
    where,
    include,
    order: [
      ["fecha_programada", "DESC"],
      ["id", "DESC"],
    ],
    limit: pageSize,
    offset,
  });

  return {
    total: count,
    page,
    pageSize,
    data: rows.map((t) => ({
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
            { model: models.TipoActividad, attributes: ["codigo", "nombre"] },
            { model: models.Lote, attributes: ["nombre"] },
            {
                model: models.TareaAsignacion,
                include: [
                    {
                        model: models.Usuario,
                        attributes: ["id", "nombres", "apellidos"],
                    },
                ],
            },
            {
                model: models.TareaEstado,
                include: [
                    {
                        model: models.Usuario,
                        attributes: ["id", "nombres", "apellidos"],
                    },
                ],
            },
            {
                model: models.Novedad,
                include: [
                    {
                        model: models.Usuario,
                        attributes: ["id", "nombres", "apellidos"],
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
                attributes: [
                    "id",
                    "nombre",
                    "numero",
                    "anio_agricola",
                    "estado",
                ],
            },
            {
                model: models.PeriodoCosecha,
                attributes: ["id", "nombre", "semana_inicio", "semana_fin"],
            },
            { model: models.TareaRequerimiento, include: [
          { model: models.InventarioItem, attributes: ['id','nombre','categoria','unidad_id'] },
          { model: models.Unidad, attributes: ['codigo'] }
      ]},
      { model: models.TareaInsumo, include: [
          { model: models.InventarioItem, attributes: ['id','nombre','unidad_id'] },
          { model: models.Unidad, attributes: ['codigo'] }
      ]},
    ],
  });
    if (!tarea) return null;

    // Si trabajador, solo si está asignado
    if (currentUser.role === "Trabajador") {
        const isAssigned = tarea.TareaAsignacions?.some(
            (a) => a.usuario_id === currentUser.sub
        );
        if (!isAssigned) throw forbidden();
    }

    return {
        id: tarea.id,
        tipo: tarea.TipoActividad?.nombre,
        titulo: tarea.titulo,
        tipo_codigo: tarea.TipoActividad?.codigo,
        lote_id: tarea.lote_id,
        lote: tarea.Lote?.nombre,
        fecha_programada: tarea.fecha_programada,
        descripcion: tarea.descripcion,
        estado: tarea.estado,
        detalles: tarea.detalles,
        creador: tarea.Creador
            ? {
                  id: tarea.Creador.id,
                  nombre: `${tarea.Creador.nombres} ${tarea.Creador.apellidos}`,
              }
            : null,
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
        cosecha: tarea.Cosecha ? tarea.Cosecha.nombre : undefined,
        periodo: tarea.PeriodoCosecha ? tarea.PeriodoCosecha.nombre : undefined,
        requerimientos: (tarea.TareaRequerimientos || []).map(r => ({
      id: r.id,
      categoria: r.categoria, // Herramienta|Equipo
      item_id: r.item_id,
      nombre: r.InventarioItem?.nombre,
      unidad: r.Unidad?.codigo,
      cantidad: r.cantidad
    })),
    insumos: (tarea.TareaInsumos || []).map(x => ({
      id: x.id, item_id: x.item_id, item: x.InventarioItem?.nombre, unidad: x.Unidad?.codigo, cantidad: x.cantidad
    })),
    };
};
// Reemplaza/actualiza los insumos de la tarea y sincroniza reservas (no mueve stock todavía)
exports.configurarInsumos = async (currentUser, tareaId, body, io) => {
  if (!["Propietario", "Tecnico"].includes(currentUser.role)) throw forbidden();

  const { insumos } = body || {};
  if (!Array.isArray(insumos)) throw badRequest("insumos debe ser un arreglo");

  const tarea = await models.Tarea.findByPk(tareaId);
  if (!tarea) throw notFound("Tarea no existe");
  if (["Completada", "Verificada", "Cancelada"].includes(tarea.estado)) {
    throw badRequest("No se puede modificar una tarea cerrada");
  }

  // Validación preliminar
  const normalizados = [];
  for (const it of insumos) {
    if (!it.item_id || !it.cantidad || !(it.unidad_id || it.unidad_codigo)) {
      throw badRequest("item_id, cantidad y unidad son obligatorios");
    }
    const item = await models.InventarioItem.findByPk(it.item_id);
    if (!item) throw badRequest(`Ítem inválido: ${it.item_id}`);
    if (item.categoria === "Herramienta") {
      throw badRequest("Las herramientas no se agregan como insumo (use requerimientos/préstamo).");
    }
    const unidad = it.unidad_id
      ? await models.Unidad.findByPk(it.unidad_id)
      : await models.Unidad.findOne({ where: { codigo: it.unidad_codigo } });
    if (!unidad) throw badRequest("unidad inválida");

    // Convertimos a unidad base para reservar
    const factor = await invService._getFactor(unidad.id, item.unidad_id);
    const enBase = Number(it.cantidad) * factor;

    normalizados.push({
      item, unidad, cant: Number(it.cantidad), unidad_id: unidad.id,
      cantidad_en_base: enBase,
    });
  }

  // Transacción: reemplaza TareaInsumo + actualiza reservas
  await sequelize.transaction(async (t) => {
    // 1) limpiar insumos previos de la tarea
    await models.TareaInsumo.destroy({ where: { tarea_id: tareaId }, transaction: t });

    // 2) crear insumos nuevos
    await models.TareaInsumo.bulkCreate(
      normalizados.map(n => ({
        tarea_id: tareaId,
        item_id: n.item.id,
        unidad_id: n.unidad_id,
        cantidad: n.cant,
      })), { transaction: t }
    );

    // 3) anular reservas previas (sólo insumos) y crear reservas nuevas
    await models.InventarioReserva.update(
      { estado: "Anulada" },
      { where: { tarea_id: tareaId, estado: "Reservada" }, transaction: t }
    );

    await models.InventarioReserva.bulkCreate(
      normalizados.map(n => ({
        tarea_id: tareaId,
        item_id: n.item.id,
        cantidad_en_base: n.cantidad_en_base,
        estado: "Reservada",
        fecha: new Date(),
      })), { transaction: t }
    );

    // 4) actividad
    await models.TareaEstado.create({
      tarea_id: tareaId,
      estado: tarea.estado,
      usuario_id: currentUser.sub,
      comentario: `Se han asignado insumos a la tarea #${tareaId}.`,
    }, { transaction: t });
  });

  // sockets (tarea + inventario)
  emitTarea(io, tareaId, "insumos");
  if (io) io.emit("inventario:update");

  // respuesta
  return await exports.obtenerTarea(currentUser, tareaId);
};


exports.listarInsumos = async (currentUser, tareaId) => {
    const tarea = await models.Tarea.findByPk(tareaId);
    if (!tarea) throw notFound("Tarea no existe");
    if (currentUser.role === "Trabajador") {
        const asign = await models.TareaAsignacion.findOne({
            where: { tarea_id: tareaId, usuario_id: currentUser.sub },
        });
        if (!asign) throw forbidden();
    }
    const list = await models.TareaInsumo.findAll({
        where: { tarea_id: tareaId },
        include: [
            {
                model: models.InventarioItem,
                attributes: ["nombre", "unidad_id"],
            },
            { model: models.Unidad, attributes: ["codigo"] },
        ],
    });
    return list.map((x) => ({
        id: x.id,
        item_id: x.item_id,
        item: x.InventarioItem?.nombre,
        unidad: x.Unidad?.codigo,
        cantidad: x.cantidad,
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
  const requested = usuarios.map(Number);
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


// backend/src/modules/tareas/tareas.service.js
exports.configurarRequerimientos = async (currentUser, tareaId, body, io) => {
  if (!["Propietario","Tecnico"].includes(currentUser.role)) throw forbidden();
  const { requerimientos = [] } = body || {}; // [{item_id, cantidad, unidad_id|unidad_codigo, categoria:'Herramienta'|'Equipo'}]
  const tarea = await models.Tarea.findByPk(tareaId);
  if (!tarea) throw notFound("Tarea no existe");
  if (["Completada","Verificada","Cancelada"].includes(tarea.estado)) throw badRequest("No se puede modificar una tarea cerrada");

  // Validar y normalizar
  const norm = [];
  for (const r of requerimientos) {
    if (!r.item_id || !r.cantidad || !(r.unidad_id || r.unidad_codigo) || !r.categoria)
      throw badRequest("item_id, cantidad, unidad y categoria son obligatorios");
    const item = await models.InventarioItem.findByPk(r.item_id);
    if (!item) throw badRequest(`Ítem inválido: ${r.item_id}`);
    if (!['Herramienta','Equipo'].includes(r.categoria)) throw badRequest('categoria inválida');
    const unidad = r.unidad_id
      ? await models.Unidad.findByPk(r.unidad_id)
      : await models.Unidad.findOne({ where: { codigo: r.unidad_codigo }});
    if (!unidad) throw badRequest("unidad inválida");

    // convertir a unidad base del item
    const factor = await invService._getFactor(unidad.id, item.unidad_id);
    const enBase = Number(r.cantidad) * factor;

    norm.push({ item, unidad, cantidad: Number(r.cantidad), unidad_id: unidad.id, categoria: r.categoria, cantidad_en_base: enBase });
  }

  await sequelize.transaction(async (t) => {
    // Reemplazar requerimientos
    await models.TareaRequerimiento.destroy({ where: { tarea_id: tareaId } , transaction: t});
    await models.TareaRequerimiento.bulkCreate(
      norm.map(n => ({
        tarea_id: tareaId,
        item_id: n.item.id,
        unidad_id: n.unidad_id,
        cantidad: n.cantidad,
        categoria: n.categoria,
      })), { transaction: t }
    );

    // Reservas: anular antiguas H/E y crear nuevas
    await models.InventarioReserva.update(
      { estado: 'Anulada' },
      { where: { tarea_id: tareaId, estado: 'Reservada' }, transaction: t }
    );
    await models.InventarioReserva.bulkCreate(
      norm.map(n => ({
        tarea_id: tareaId,
        item_id: n.item.id,
        cantidad_en_base: n.cantidad_en_base,
        estado: 'Reservada',
        fecha: new Date(),
      })), { transaction: t }
    );

    // Actividad
    await models.TareaEstado.create({
      tarea_id: tareaId,
      estado: tarea.estado,
      usuario_id: currentUser.sub,
      comentario: `Se han asignado ${norm.length === 1 ? 'requerimientos' : 'requerimientos'} (herramientas/equipos) a la tarea #${tareaId}.`
    }, { transaction: t });
  });

  // sockets
  if (io) {
    io.emit("tareas:update");
    io.to(`tarea:${tareaId}`).emit("tarea:insumos", { tareaId }); // reutilizamos para refrescar panel
    io.emit("inventario:update");
  }

  return await exports.obtenerTarea(currentUser, tareaId);
};



// backend/src/modules/tareas/tareas.service.js

exports.listarRequerimientosTarea = async (currentUser, tareaId) => {
  const tarea = await models.Tarea.findByPk(tareaId);
  if (!tarea) throw notFound("Tarea no existe");

  // Permisos: Trabajador solo si está asignado; Técnico/Propietario pueden ver
  if (currentUser.role === "Trabajador") {
    const asign = await models.TareaAsignacion.findOne({
      where: { tarea_id: tareaId, usuario_id: currentUser.sub },
    });
    if (!asign) throw forbidden();
  }

  const list = await models.TareaRequerimiento.findAll({
    where: { tarea_id: tareaId },
    include: [
      { model: models.InventarioItem, attributes: ['nombre', 'categoria'] },
      { model: models.Unidad, attributes: ['codigo'] },
    ],
    order: [['id','ASC']],
  });

  // shape amigable para el frontend
  return list.map(r => ({
    id: r.id,
    item_id: r.item_id,
    item: r.InventarioItem?.nombre,
    categoria: r.categoria,                 // 'Herramienta' | 'Equipo'
    cantidad: r.cantidad,
    unidad: r.Unidad?.codigo || 'unidad',   // normalmente 'unidad'
  }));
};
