const { app } = require('./app');
const { config } = require('./config/env');
const db = require('./db');
const http = require('http');
const { Server } = require('socket.io');

(async () => {

  console.log("--------------------------------------------------");
  console.log(`🚀 Iniciando servidor en entorno: ${config.env.toUpperCase()}`);
  
  // Mensajes de advertencia / info dependiendo del entorno
  if (config.env === "development") {
    console.log("🌱 MODO DESARROLLO: Base de datos de desarrollo, tablas pueden alterarse.");
  } 
  else if (config.env === "test") {
    console.log("🧪 MODO TEST: Usando base de datos de pruebas (se borra y recrea con cada test).");
  }
  else if (config.env === "production") {
    console.log("🔥 MODO PRODUCCIÓN: Modo seguro, sin sync automático.");
  }
  console.log("--------------------------------------------------");

  await db.connect();

  // Sincroniza solo en dev
  if (config.env === 'development') {
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
    methods: ["GET", "POST"],
  },
});

  app.set("io", io);

io.on("connection", (socket) => {
  console.log("Cliente conectado:", socket.id);

  socket.on("join:user", (userId) => {
    if (!userId) return;
    socket.join(`user:${userId}`);
  });

  socket.on("leave:user", (userId) => {
    if (!userId) return;
    socket.leave(`user:${userId}`);
  });

  socket.on("join:tarea", (tareaId) => {
    socket.join(`tarea:${tareaId}`);
  });

  socket.on("leave:tarea", (tareaId) => {
    socket.leave(`tarea:${tareaId}`);
  });

  socket.on("disconnect", () => {
    console.log("Cliente desconectado:", socket.id);
  });
});


  // 🚀 Levantar servidor
  server.listen(config.port, () => {
    console.log(`API + Socket escuchando en :${config.port}`);
    console.log(`🌐 Entorno activo: ${config.env.toUpperCase()}`);
  });

})();
