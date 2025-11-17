// src/test/tareas/tarea.assign.test.js
const request = require("supertest");
const {app} = require("../../app");
const db = require("../../db");
const tareasRouter = require("../../modules/tareas/tareas.routes");

app.use("/api/tareas", tareasRouter);

const {
  Usuario,
  Role,
  TipoActividad,
  Cosecha,
  PeriodoCosecha,
  Lote,
  Tarea,
  TareaAsignacion,
} = db;

let tokenTecnico;
let lote;
let cosecha;
let periodoReposo;
let tipoPoda;
let tecnico1;
let trabajadorActivo;
let trabajadorInactivo;



beforeAll(async () => {
  await db.sequelize.sync({ force: true });
    const rolTecnico = await Role.create({ nombre: "Tecnico" });
  const rolTrabajador = await Role.create({ nombre: "Trabajador" });

  // Datos base
  lote = await Lote.create({
    nombre: "Lote 1",
    superficie_ha: 1,
    numero_plantas: 100,
    estado: "Activo",
  });

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

  tipoPoda = await TipoActividad.create({ codigo: "poda", nombre: "Poda" });



  // Usuarios
  tecnico1 = await Usuario.create({
    cedula: "1111111111",
    nombres: "Técnico",
    apellidos: "Principal",
    email: "tecnico@test.com",
    telefono: "0000000000",
    direccion: "Palora",
    role_id: rolTecnico.id,
    password_hash: "$2a$10$abcdefghijklmnopqrstuv",
    estado: "Activo",
  });

  trabajadorActivo = await Usuario.create({
    cedula: "2222222222",
    nombres: "Trabajador",
    apellidos: "Activo",
    email: "trabajador.activo@test.com",
    telefono: "0000000001",
    direccion: "Palora",
    role_id: rolTrabajador.id,
    password_hash: "$2a$10$abcdefghijklmnopqrstuv",
    estado: "Activo",
  });

  trabajadorInactivo = await Usuario.create({
    cedula: "3333333333",
    nombres: "Trabajador",
    apellidos: "Inactivo",
    email: "trabajador.inactivo@test.com",
    telefono: "0000000002",
    direccion: "Palora",
    role_id: rolTrabajador.id,
    password_hash: "$2a$10$abcdefghijklmnopqrstuv",
    estado: "Inactivo",
  });

  // Login técnico
  const resLogin = await request(app)
    .post("/api/auth/login")
    .send({ email: "tecnico@test.com", password: "cualquiercosa" });

  tokenTecnico = resLogin.body?.accessToken || resLogin.body?.token || "";
});

afterAll(async () => {
  await db.sequelize.close();
});

describe("POST /api/tareas - pruebas de asignación inicial", () => {
  const endpoint = "/api/tareas";

  test("Asigna usuarios correctamente al crear una tarea", async () => {
    const res = await request(app)
      .post(endpoint)
      .set("Authorization", `Bearer ${tokenTecnico}`)
      .send({
        titulo: "Poda con asignaciones",
        tipo_codigo: "poda",
        lote_id: lote.id,
        cosecha_id: cosecha.id,
        periodo_id: periodoReposo.id,
        fecha_programada: "2025-11-14T21:00:00.000Z",
        detalle: {
          tipo: "Formacion",
          plantas_intervenidas: 80,
          herramientas_desinfectadas: true,
        },
        asignados: [trabajadorActivo.id],
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.estado).toBe("Asignada");
    expect(res.body.asignaciones).toHaveLength(1);
    expect(res.body.asignaciones[0].usuario.id).toBe(String(trabajadorActivo.id));

    const asignacionesDb = await TareaAsignacion.findAll({
      where: { tarea_id: res.body.id },
    });
    expect(asignacionesDb).toHaveLength(1);
  });

  test("Error si se intenta asignar un usuario inactivo", async () => {
    const res = await request(app)
      .post(endpoint)
      .set("Authorization", `Bearer ${tokenTecnico}`)
      .send({
        titulo: "Poda con usuario inactivo",
        tipo_codigo: "poda",
        lote_id: lote.id,
        cosecha_id: cosecha.id,
        periodo_id: periodoReposo.id,
        fecha_programada: "2025-11-14T21:00:00.000Z",
        detalle: {
          tipo: "Formacion",
          plantas_intervenidas: 80,
          herramientas_desinfectadas: true,
        },
        asignados: [trabajadorInactivo.id],
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message || res.body.error).toMatch(/usuarios inválidos o inactivos/i);
  });

  test("Error si se intenta asignar un usuario inexistente", async () => {
    const idInexistente = 99999;
    const res = await request(app)
      .post(endpoint)
      .set("Authorization", `Bearer ${tokenTecnico}`)
      .send({
        titulo: "Poda con usuario inexistente",
        tipo_codigo: "poda",
        lote_id: lote.id,
        cosecha_id: cosecha.id,
        periodo_id: periodoReposo.id,
        fecha_programada: "2025-11-14T21:00:00.000Z",
        detalle: {
          tipo: "Formacion",
          plantas_intervenidas: 80,
          herramientas_desinfectadas: true,
        },
        asignados: [idInexistente],
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message || res.body.error).toMatch(/usuarios inválidos o inactivos/i);
  });
});
