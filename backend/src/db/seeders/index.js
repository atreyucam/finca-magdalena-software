/**
 * SEED BÁSICO – ROLES, USUARIOS, UNIDADES, TIPOS, INVENTARIO
 * ----------------------------------------------------------------------
 * Crea:
 *  - Roles
 *  - Usuarios
 *  - Unidades
 *  - Items de Inventario
 *  - Tipos de Actividad (en minúsculas)
 */

module.exports = async function runSeed(models) {
  const { hashPassword } = require("../../utils/crypto");

  // --------------------------------------------------------
  // HELPERS
  // --------------------------------------------------------
  async function ensure(model, where, defaults) {
    const [o] = await model.findOrCreate({ where, defaults: { ...where, ...defaults } });
    return o;
  }

  async function ensureUnidad(codigo, nombre) {
    return ensure(models.Unidad, { codigo }, { codigo, nombre });
  }

  async function ensureRole(nombre) {
    return ensure(models.Role, { nombre }, { nombre });
  }

  async function ensureItem(nombre, data) {
    return ensure(models.InventarioItem, { nombre }, data);
  }

  async function ensureUsuario(email, data) {
    return ensure(models.Usuario, { email }, data);
  }

  // --------------------------------------------------------
  // ROLES
  // --------------------------------------------------------
  const rolProp = await ensureRole("Propietario");
  const rolTec  = await ensureRole("Tecnico");
  const rolTrab = await ensureRole("Trabajador");

  // --------------------------------------------------------
  // UNIDADES
  // --------------------------------------------------------
  const uUnidad = await ensureUnidad("unidad", "Unidad");
  const uKg     = await ensureUnidad("kg", "Kilogramo");
  const uL      = await ensureUnidad("l", "Litro");

  // --------------------------------------------------------
  // TIPOS DE ACTIVIDAD (minúsculas)
  // --------------------------------------------------------
  const tipos = [
    ["poda", "Poda"],
    ["maleza", "Manejo de malezas"],
    ["nutricion", "Nutrición"],
    ["fitosanitario", "Protección fitosanitaria"],
    ["enfundado", "Enfundado"],
    ["cosecha", "Cosecha"]
  ];

  for (const [codigo, nombre] of tipos) {
    await ensure(models.TipoActividad, { codigo }, { nombre });
  }

  // --------------------------------------------------------
  // USUARIOS
  // --------------------------------------------------------
  const admin = await ensureUsuario("admin@finca.test", {
    cedula: "0000000000",
    nombres: "Admin",
    apellidos: "Finca",
    telefono: "0000000000",
    direccion: "Palora",
    role_id: rolProp.id,
    password_hash: await hashPassword("admin12345"),
    estado: "Activo"
  });

  const tecnico = await ensureUsuario("tecnico@finca.test", {
    cedula: "1111111111",
    nombres: "Tecnico",
    apellidos: "Principal",
    telefono: "0000000001",
    direccion: "Palora",
    role_id: rolTec.id,
    password_hash: await hashPassword("tec123456"),
    estado: "Activo"
  });

  const trabajador = await ensureUsuario("trabajador@finca.test", {
    cedula: "2222222222",
    nombres: "Juan",
    apellidos: "Pérez",
    telefono: "0000000002",
    direccion: "Palora",
    role_id: rolTrab.id,
    password_hash: await hashPassword("trab123456"),
    estado: "Activo"
  });

  // para evitar warnings de no usados
  void admin;
  void tecnico;
  void trabajador;

  // --------------------------------------------------------
  // INVENTARIO
  // --------------------------------------------------------
  const items = [
    ["Fertilizante NPK", "Insumo",     uKg.id,     100, 10],
    ["SCORE",            "Insumo",     uL.id,      5,   1],
    ["Machete",          "Herramienta",uUnidad.id, 10,  2],
    ["Tijeras de poda",  "Herramienta",uUnidad.id, 5,   1],
    ["Motoguadaña Stihl","Equipo",     uUnidad.id, 2,   0]
  ];

  for (const [nombre, categoria, unidad_id, stock, min] of items) {
    await ensureItem(nombre, {
      nombre,
      categoria,
      unidad_id,
      stock_actual: stock,
      stock_minimo: min
    });
  }

  console.log("✅ SEED BÁSICO COMPLETO: roles, usuarios, unidades, tipos e inventario creados.");
};
