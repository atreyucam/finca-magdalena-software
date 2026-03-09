// src/server.js
const { app } = require("./app");
const { config } = require("./config/env");
const db = require("./db");
const notifs = require("./modules/notificaciones/notificaciones.service");
const http = require("http");
const { Server } = require("socket.io");
const { verifyAccess } = require("./utils/jwt");
const { buildAllowedOrigins, isOriginAllowed } = require("./utils/cors");
const { assertTaskResourceAccess } = require("./modules/tareas/tareas.access");
const { assertSessionWithinBounds } = require("./modules/auth/session.policy");

(async () => {
  console.log("--------------------------------------------------");
  console.log(`🚀 Iniciando servidor en entorno: ${String(config.env).toUpperCase()}`);

  if (config.env === "development") {
    console.log("🌱 MODO DESARROLLO: Base de datos de desarrollo, tablas pueden alterarse.");
  } else if (config.env === "test") {
    console.log("🧪 MODO TEST: Usando base de datos de pruebas (se borra y recrea con cada test).");
  } else if (config.env === "production") {
    console.log("🔥 MODO PRODUCCIÓN: Modo seguro, sin sync automático.");
  }
  console.log("--------------------------------------------------");

  await db.connect();

  // Sincroniza solo en dev
  if (config.env === "development") {
    await db.sync();
    // await db.seed();
  }

  // ⚙️ Crear servidor HTTP
  const server = http.createServer(app);
  const allowedOrigins = buildAllowedOrigins(config.env, config.frontendUrl);

  // 🔌 socket.io
  const io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (isOriginAllowed(origin, allowedOrigins)) return callback(null, true);
        return callback(new Error("Not allowed by CORS"));
      },
      credentials: true,
      methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
    },
  });

  // ✅ disponible en controladores via req.app.get("io")
  app.set("io", io);
  // ✅ disponible para servicios que crean notificaciones sin recibir io por parámetro
  notifs.setSocketServer(io);

  const runNotificacionesPurge = async () => {
    try {
      const result = await notifs.purgarAntiguas();
      if (result?.deleted > 0) {
        console.log(
          `[notificaciones] Purga lifecycle completada. Eliminadas: ${result.deleted}. Corte: ${result.cutoff?.toISOString?.() || "n/a"}`
        );
      }
    } catch (error) {
      console.error("[notificaciones] Error en purga lifecycle:", error?.message || error);
    }
  };

  await runNotificacionesPurge();
  const purgeIntervalMs = Number(config.notifications?.purgeIntervalMs) || 12 * 60 * 60 * 1000;
  const purgeTimer = setInterval(runNotificacionesPurge, purgeIntervalMs);
  if (typeof purgeTimer.unref === "function") purgeTimer.unref();

  // ============================
  // ✅ Socket Auth (JWT)
  // ============================
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace("Bearer ", "") ||
        socket.handshake.query?.token;

      if (!token) return next(new Error("UNAUTHORIZED"));

      const payload = verifyAccess(token);
      if (!payload?.sub) return next(new Error("UNAUTHORIZED"));
      const iatMs = Number(payload.iat) * 1000;
      const sessionStartAt = Number.isFinite(Number(payload.session_start_at))
        ? Number(payload.session_start_at)
        : iatMs;
      const lastActivityAt = Number.isFinite(Number(payload.last_activity_at))
        ? Number(payload.last_activity_at)
        : sessionStartAt;
      assertSessionWithinBounds({ sessionStartAt, lastActivityAt });
      socket.user = payload;

      next();
    } catch (e) {
      return next(new Error("UNAUTHORIZED"));
    }
  });

  // ============================
  // ✅ Eventos / Rooms
  // ============================
  io.on("connection", (socket) => {
    console.log("Cliente conectado:", socket.id);

    // auto-join room del usuario autenticado
    const userId = socket.user?.sub || socket.user?.id;
    if (userId) socket.join(`user:${userId}`);

    socket.on("join:tarea", async (rawTareaId, ack) => {
      const tareaId = Number(rawTareaId);
      if (!Number.isInteger(tareaId) || tareaId <= 0) {
        ack?.({ ok: false, code: "BAD_REQUEST" });
        return;
      }

      try {
        await assertTaskResourceAccess({
          tareaId,
          userId: socket.user?.sub,
          userRole: socket.user?.role,
        });
        socket.join(`tarea:${tareaId}`);
        ack?.({ ok: true });
      } catch (error) {
        socket.emit("tarea:join_denied", {
          tareaId,
          code: error.code || "FORBIDDEN",
          message: error.message || "Sin acceso a esta tarea",
        });
        ack?.({ ok: false, code: error.code || "FORBIDDEN" });
      }
    });

    socket.on("leave:tarea", (tareaId) => {
      if (!tareaId) return;
      socket.leave(`tarea:${tareaId}`);
    });

    socket.on("disconnect", () => {
      console.log("Cliente desconectado:", socket.id);
    });
  });

  // 🚀 Levantar servidor
  server.listen(config.port, () => {
    console.log(`API + Socket escuchando en :${config.port}`);
    console.log(`🌐 Entorno activo: ${String(config.env).toUpperCase()}`);
  });
})();
