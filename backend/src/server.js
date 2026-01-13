// src/server.js
const { app } = require("./app");
const { config } = require("./config/env");
const db = require("./db");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

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

  // 🔌 socket.io
  const io = new Server(server, {
    cors: {
      origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
      credentials: true,
      methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
    },
  });

  // ✅ disponible en controladores via req.app.get("io")
  app.set("io", io);

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
      if (!process.env.JWT_SECRET) return next(new Error("JWT_SECRET_MISSING"));

      const payload = jwt.verify(token, process.env.JWT_SECRET);
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

    // rooms manuales (por si los usas en otros módulos)
    socket.on("join:user", (uid) => {
      if (!uid) return;
      socket.join(`user:${uid}`);
    });

    socket.on("leave:user", (uid) => {
      if (!uid) return;
      socket.leave(`user:${uid}`);
    });

    socket.on("join:tarea", (tareaId) => {
      if (!tareaId) return;
      socket.join(`tarea:${tareaId}`);
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
