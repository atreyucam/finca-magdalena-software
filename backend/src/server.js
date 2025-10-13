const { app } = require('./app');
const { config } = require('./config/env');
const db = require('./db');
const http = require('http');
const { Server } = require('socket.io');

(async () => {
  await db.connect();

  // Sincroniza solo en dev; en prod usaremos migraciones más adelante
  if (config.env === 'development') {
    await db.sync();
    // await db.seed();
  }

  // Crear servidor HTTP con Express
  const server = http.createServer(app);

  // Inicializar socket.io
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:5173", // tu frontend
      credentials: true,
    },
  });

  // Guardar en app para acceder desde controladores
  app.set("io", io);

  // server.js (tu mismo archivo)
io.on("connection", (socket) => {
  console.log("Cliente conectado:", socket.id);

  // 👉 suscripción a una tarea concreta
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


  // Levantar servidor
  server.listen(config.port, () =>
    console.log(`API + Socket escuchando en :${config.port}`)
  );
})();
