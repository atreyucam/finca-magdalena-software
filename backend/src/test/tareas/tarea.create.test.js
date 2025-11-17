// src/test/tareas/tarea.create.test.js

const request = require("supertest");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const {app} = require("../../app");
const db = require("../../db");               // 👈 usamos el index de /db
const { config } = require("../../config/env");

const tareasRouter = require("../../modules/tareas/tareas.routes");

app.use("/api/tareas", tareasRouter);

const {
  Role,
  Usuario,
  TipoActividad,
  Cosecha,
  PeriodoCosecha,
  Lote,
} = db.models;                                // 👈 modelos desde db.models

let tokenTecnico;
let lote;
let cosecha;
let periodoReposo;

beforeAll(async () => {
  // 🔹 Preparamos la BD de pruebas en finca_test
  await db.sequelize.sync({ force: true });

  // 1) Crear rol de Técnico (cumple FK role_id)
  const rolTecnico = await Role.create({
    nombre: "Tecnico",
  });

  // 2) Crear usuario técnico con TODOS los campos obligatorios
  const passwordPlano = "Secret123!";
  const hash = await bcrypt.hash(passwordPlano, 10);

  const tecnico = await Usuario.create({
    cedula: "1111111111",
    nombres: "Técnico",
    apellidos: "Prueba",
    email: "tecnico@finca.test",
    telefono: "0999999999",
    direccion: "Sector Finca",
    fecha_ingreso: new Date(),
    estado: "Activo",
    password_hash: hash,
    role_id: rolTecnico.id,
  });

  // 3) Generar token JWT manualmente (sin depender del login)
  tokenTecnico = jwt.sign(
    { sub: tecnico.id, role: "Tecnico" },
    config.jwt.secret,
    { expiresIn: "1h" }
  );

  // 4) Lote
  lote = await Lote.create({
    nombre: "Lote 1",
    superficie_ha: 1,
    numero_plantas: 100,
    estado: "Activo",
  });

  // 5) Cosecha + periodo
  cosecha = await Cosecha.create({
    numero: 1,
    anio_agricola: "2024-2025",
    nombre: "Cosecha 1",
    fecha_inicio: "2024-08-01",
    fecha_fin: "2025-02-15",
    estado: "Activa",
  });

  periodoReposo = await PeriodoCosecha.create({
    cosecha_id: cosecha.id,
    nombre: "Reposo",
    semana_inicio: 1,
    semana_fin: 2,
  });

  // 6) Tipos de actividad
  await TipoActividad.bulkCreate([
    { codigo: "poda",          nombre: "Poda" },
    { codigo: "maleza",        nombre: "Manejo de malezas" },
    { codigo: "nutricion",     nombre: "Nutrición" },
    { codigo: "fitosanitario", nombre: "Protección fitosanitaria" },
    { codigo: "enfundado",     nombre: "Enfundado" },
    { codigo: "cosecha",       nombre: "Cosecha y postcosecha" },
  ]);
});

afterAll(async () => {
  await db.sequelize.close();
});

describe("POST /api/tareas - creación de tareas", () => {
  const endpoint = "/api/tareas";

  test("Crea una tarea de PODA correctamente (código en minúsculas)", async () => {
    const res = await request(app)
      .post(endpoint)
      .set("Authorization", `Bearer ${tokenTecnico}`)
      .send({
        titulo: "Poda de formación en Lote 1",
        tipo_codigo: "poda", // minúscula
        lote_id: lote.id,
        cosecha_id: cosecha.id,
        periodo_id: periodoReposo.id,
        fecha_programada: "2025-11-14T21:00:00.000Z",
        descripcion: "Guiado de plantas jóvenes",
        detalle: {
          tipo: "Formacion",
          plantas_intervenidas: 120,
          herramientas_desinfectadas: true,
        },
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.tipo_codigo).toBe("poda");
    expect(res.body.poda).toBeTruthy();
    expect(res.body.poda.tipo).toBe("Formacion");
  });

  test("Error si PODA no incluye detalle.tipo", async () => {
    const res = await request(app)
      .post(endpoint)
      .set("Authorization", `Bearer ${tokenTecnico}`)
      .send({
        titulo: "Poda sin tipo",
        tipo_codigo: "poda",
        lote_id: lote.id,
        cosecha_id: cosecha.id,
        periodo_id: periodoReposo.id,
        fecha_programada: "2025-11-14T21:00:00.000Z",
        detalle: {
          plantas_intervenidas: 50,
          herramientas_desinfectadas: true,
        },
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message || res.body.error).toMatch(/PODA: 'tipo' es obligatorio/i);
  });

  test("Crea tarea de MALEZA correctamente", async () => {
    const res = await request(app)
      .post(endpoint)
      .set("Authorization", `Bearer ${tokenTecnico}`)
      .send({
        titulo: "Control de malezas",
        tipo_codigo: "maleza",
        lote_id: lote.id,
        cosecha_id: cosecha.id,
        periodo_id: periodoReposo.id,
        fecha_programada: "2025-11-15T14:00:00.000Z",
        detalle: {
          metodo: "Manual",
          cobertura_estimada_pct: 40,
        },
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.tipo_codigo).toBe("maleza");
    expect(res.body.manejoMaleza).toBeTruthy();
    expect(res.body.manejoMaleza.metodo).toBe("Manual");
  });

  test("Crea tarea de NUTRICIÓN correctamente", async () => {
    const res = await request(app)
      .post(endpoint)
      .set("Authorization", `Bearer ${tokenTecnico}`)
      .send({
        titulo: "Fertilización con NPK",
        tipo_codigo: "nutricion",
        lote_id: lote.id,
        cosecha_id: cosecha.id,
        periodo_id: periodoReposo.id,
        fecha_programada: "2025-11-16T08:00:00.000Z",
        detalle: {
          metodo_aplicacion: "Drench",
        },
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.tipo_codigo).toBe("nutricion");
    expect(res.body.nutricion).toBeTruthy();
    expect(res.body.nutricion.metodo_aplicacion).toBe("Drench");
  });

  test("Crea tarea FITOSANITARIA correctamente", async () => {
    const res = await request(app)
      .post(endpoint)
      .set("Authorization", `Bearer ${tokenTecnico}`)
      .send({
        titulo: "Control de antracnosis",
        tipo_codigo: "fitosanitario",
        lote_id: lote.id,
        cosecha_id: cosecha.id,
        periodo_id: periodoReposo.id,
        fecha_programada: "2025-11-17T09:00:00.000Z",
        detalle: {
          plaga_enfermedad: "Antracnosis",
          conteo_umbral: "7/10",
          periodo_carencia_dias: 14,
        },
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.tipo_codigo).toBe("fitosanitario");
    expect(res.body.fitosanitario).toBeTruthy();
    expect(res.body.fitosanitario.plaga_enfermedad).toBe("Antracnosis");
  });

  test("Crea tarea ENFUNDADO correctamente", async () => {
    const res = await request(app)
      .post(endpoint)
      .set("Authorization", `Bearer ${tokenTecnico}`)
      .send({
        titulo: "Enfundado de frutos",
        tipo_codigo: "enfundado",
        lote_id: lote.id,
        cosecha_id: cosecha.id,
        periodo_id: periodoReposo.id,
        fecha_programada: "2025-11-18T07:30:00.000Z",
        detalle: {
          frutos_enfundados: 500,
        },
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.tipo_codigo).toBe("enfundado");
    expect(res.body.enfundado).toBeTruthy();
    expect(res.body.enfundado.frutos_enfundados).toBe(500);
  });

  test("Crea tarea de COSECHA sin detalle", async () => {
    const res = await request(app)
      .post(endpoint)
      .set("Authorization", `Bearer ${tokenTecnico}`)
      .send({
        titulo: "Cosecha lote 1",
        tipo_codigo: "cosecha",
        lote_id: lote.id,
        cosecha_id: cosecha.id,
        periodo_id: periodoReposo.id,
        fecha_programada: "2025-11-19T06:00:00.000Z",
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.tipo_codigo).toBe("cosecha");
    expect(res.body.cosecha).toBeUndefined(); // no hay detalle 1:1
  });
});
