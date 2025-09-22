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
exports.crearTarea = async (currentUser, data, io) => {
    if (!["Propietario", "Tecnico"].includes(currentUser.role))
        throw forbidden();

    const {
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

    // Resolver tipo
    let tipoId = tipo_id;
    if (!tipoId && tipo_codigo) {
        const tipo = await models.TipoActividad.findOne({
            where: { codigo: tipo_codigo },
        });
        if (!tipo) throw badRequest("tipo_codigo inválido");
        tipoId = tipo.id;
    }

    // Validar lote
    const lote = await models.Lote.findByPk(lote_id);
    if (!lote) throw badRequest("lote_id inválido");

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

    // Crear tarea
    const tarea = await models.Tarea.create({
        tipo_id: tipoId,
        lote_id,
        fecha_programada,
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
        comentario: "Creada",
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

exports.completarTarea = async (currentUser, tareaId, comentario, io) => {
    const tarea = await models.Tarea.findByPk(tareaId);
    if (!tarea) throw notFound("Tarea no existe");
    if (["Verificada", "Cancelada"].includes(tarea.estado))
        throw badRequest("La tarea ya fue cerrada");
    // Permisos: Trabajador debe estar asignado; Técnico puede completar; Propietario no completa
    if (currentUser.role === "Trabajador") {
        const asign = await models.TareaAsignacion.findOne({
            where: { tarea_id: tareaId, usuario_id: currentUser.sub },
        });
        if (!asign)
            throw forbidden("Solo los asignados pueden completar la tarea");
    } else if (currentUser.role === "Propietario") {
        throw forbidden("El propietario no completa tareas");
    }

    if (tarea.estado === "Completada")
        return await exports.obtenerTarea(currentUser, tareaId);

    await sequelize.transaction(async (t) => {
        tarea.estado = "Completada";
        await tarea.save({ transaction: t });
        await models.TareaEstado.create(
            {
                tarea_id: tarea.id,
                estado: "Completada",
                usuario_id: currentUser.sub,
                comentario: comentario || null,
            },
            { transaction: t }
        );
    });

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

// === modificar verificarTarea para consumo automático ===
exports.verificarTarea = async (currentUser, tareaId, comentarioOrBod, io) => {
    // Permitir que controller pase body con { comentario, force }
    let comentario =
        typeof comentarioOrBody === "string"
            ? comentarioOrBody
            : comentarioOrBody?.comentario;
    const force =
        typeof comentarioOrBody === "object" ? !!comentarioOrBody.force : false;

    if (currentUser.role !== "Tecnico")
        throw forbidden("Solo el técnico puede verificar");
    const tarea = await models.Tarea.findByPk(tareaId);
    if (!tarea) throw notFound("Tarea no existe");
    if (tarea.estado !== "Completada")
        throw badRequest("Para verificar, la tarea debe estar Completada");

    // Evitar doble consumo: si ya existen movimientos con referencia a esta tarea, saltar consumo
    const yaHayConsumo = await models.InventarioMovimiento.findOne({
        where: { referencia: { [Op.contains]: { tarea_id: tareaId } } },
    });

    await sequelize.transaction(async (t) => {
        // Procesar consumo si aplica e idempotente
        if (!yaHayConsumo) {
            const insumos = await models.TareaInsumo.findAll({
                where: { tarea_id: tareaId },
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
                    if (err.code === "LOW_STOCK" && !force)
                        throw badRequest(
                            `Stock insuficiente para ${item.nombre}. Usa force=true para confirmar.`
                        );
                    if (err.code === "LOW_STOCK" && force) {
                        // Forzar salida incluso en negativo: repetimos moverStock sin la validación (delta directo)
                        const factor = await invService._getFactor(
                            x.unidad_id,
                            item.unidad_id
                        );
                        const cantBase = Number(x.cantidad) * factor;
                        const itemLocked = await models.InventarioItem.findByPk(
                            item.id,
                            { transaction: t, lock: t.LOCK.UPDATE }
                        );
                        const nuevo =
                            Number(itemLocked.stock_actual) - cantBase;
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

        tarea.estado = "Verificada";
        await tarea.save({ transaction: t });
        await models.TareaEstado.create(
            {
                tarea_id: tarea.id,
                estado: "Verificada",
                usuario_id: currentUser.sub,
                comentario: comentario || null,
            },
            { transaction: t }
        );
    });

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

    // Permisos: asignados, técnico, propietario
    if (currentUser.role === "Trabajador") {
        const asign = await models.TareaAsignacion.findOne({
            where: { tarea_id: tareaId, usuario_id: currentUser.sub },
        });
        if (!asign)
            throw forbidden("Solo asignados pueden registrar novedades");
    }

    const nov = await models.Novedad.create({
        tarea_id: tareaId,
        autor_id: currentUser.sub,
        texto,
    });
    if (io) io.emit("tareas:update");
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
      lote: t.Lote?.nombre,
      lote_id: t.lote_id,
      fecha_programada: t.fecha_programada,
      descripcion: t.descripcion,
      estado: t.estado,
      detalles: t.detalles,
      asignados: (t.TareaAsignacions || []).map((a) => ({
        id: a.Usuario?.id,
        nombres: a.Usuario?.nombres,
        apellidos: a.Usuario?.apellidos,
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
    };
};

// Configurar/Actualizar insumos de la tarea: reemplaza la lista completa
exports.configurarInsumos = async (currentUser, tareaId, body, io) => {
    if (!["Propietario", "Tecnico"].includes(currentUser.role))
        throw forbidden();
    const { insumos } = body || {};
    if (!Array.isArray(insumos))
        throw badRequest("insumos debe ser un arreglo");
    const tarea = await models.Tarea.findByPk(tareaId);
    if (!tarea) throw notFound("Tarea no existe");
    if (["Completada", "Verificada", "Cancelada"].includes(tarea.estado))
        throw badRequest("No se puede modificar una tarea cerrada");

    // Validar ítems y unidades
    for (const it of insumos) {
        if (!it.item_id || !it.cantidad || !(it.unidad_id || it.unidad_codigo))
            throw badRequest("item_id, cantidad y unidad son obligatorios");
        const item = await models.InventarioItem.findByPk(it.item_id);
        if (!item) throw badRequest(`Ítem inválido: ${it.item_id}`);
        if (item.categoria === "Herramienta")
            throw badRequest("Use préstamos para herramientas, no como insumo");
        const uni = it.unidad_id
            ? await models.Unidad.findByPk(it.unidad_id)
            : await models.Unidad.findOne({
                  where: { codigo: it.unidad_codigo },
              });
        if (!uni) throw badRequest("unidad inválida");
    }

    // Reemplazar lista
    await models.TareaInsumo.destroy({ where: { tarea_id: tareaId } });
    const rows = await Promise.all(
        insumos.map(async (it) => {
            const uni = it.unidad_id
                ? { id: it.unidad_id }
                : await models.Unidad.findOne({
                      where: { codigo: it.unidad_codigo },
                  });
            return models.TareaInsumo.create({
                tarea_id: tareaId,
                item_id: it.item_id,
                unidad_id: uni.id,
                cantidad: it.cantidad,
            });
        })
    );

    if (io) io.emit("tareas:update");
    return rows.map((r) => r.toJSON());
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
