/**
 * SEED BÁSICO - CATÁLOGOS + 1 PROPIETARIO
 * --------------------------------------
 * - Roles
 * - Unidades
 * - Tipos de actividad
 * - 1 usuario Propietario
 */

module.exports = async function runSeed(models) {
  const { hashPassword } = require("../../utils/crypto");

  // Configuración
  const RESET = true;
// Bloquear por defecto en producción
if (process.env.NODE_ENV === "production" && process.env.ALLOW_PROD_SEED !== "true") {
  throw new Error("❌ NO EJECUTAR EN PROD (set ALLOW_PROD_SEED=true para habilitar)");
}


  console.log("🌱 Seed Básico: Iniciando...");

  // ✅ Helper: guardar solo atributos existentes (por si tu modelo cambió)
  const pickAttrs = (model, payload) => {
    const attrs = model?.rawAttributes ? Object.keys(model.rawAttributes) : [];
    const out = {};
    for (const k of Object.keys(payload)) if (attrs.includes(k)) out[k] = payload[k];
    return out;
  };

  // 1) LIMPIEZA (solo lo que vamos a recrear)
  if (RESET) {
    console.log("🧹 Limpiando catálogos y usuarios...");

    const tables = [
      models.Usuario,
      models.TipoActividad,
      models.Unidad,
      models.Role,
    ];

    for (const m of tables) {
      if (m) {
        await m.destroy({ where: {}, truncate: true, cascade: true, restartIdentity: true });
      }
    }
  }

  // 2) ROLES
  console.log("🏗️ Creando Roles...");
  const roles = {};
  for (const r of ["Propietario", "Tecnico", "Trabajador"]) {
    roles[r] = await models.Role.create({ nombre: r });
  }

  // 3) UNIDADES
  console.log("🏗️ Creando Unidades...");
  const unidadesBase = [
    { codigo: "KG", nombre: "Kilogramo" },
    { codigo: "G", nombre: "Gramo" },
    { codigo: "L", nombre: "Litro" },
    { codigo: "ML", nombre: "Mililitro" },
    { codigo: "GAL", nombre: "Galón" },
    { codigo: "UND", nombre: "Unidad" },
    { codigo: "HA", nombre: "Hectárea" },
    { codigo: "M", nombre: "Metro" },
    { codigo: "CM", nombre: "Centímetro" },
  ];

  for (const it of unidadesBase) {
    await models.Unidad.create({
      codigo: it.codigo,
      nombre: it.nombre,
    });
  }

  // 4) TIPOS DE ACTIVIDAD
  console.log("🏗️ Creando Tipos de Actividad...");
  const listaTipos = [
    ["poda", "Poda"],
    ["maleza", "Control de malezas"],
    ["nutricion", "Fertilizacion"],
    ["fitosanitario", "Control fitosanitario"],
    ["enfundado", "Enfundado"],
    ["cosecha", "Cosecha"],
  ];

  for (const [codigo, nombre] of listaTipos) {
    await models.TipoActividad.create({ codigo, nombre });
  }

// 5) USUARIOS
console.log("👤 Creando usuarios...");

const pass = await hashPassword("123456");

// ✅ SOLO este es protegido
await models.Usuario.create({
  cedula: "0102030405",
  nombres: "German Patricio",
  apellidos: "Villacis Camacho",
  email: "g.villacis@fmagdalena.com",
  password_hash: pass,
  role_id: roles.Propietario.id,
  estado: "Activo",
  tipo: "Fijo",
  protegido: true,
});

// ❌ Alex ya NO es protegido
await models.Usuario.create({
  cedula: "0102030406",
  nombres: "Alex Jonathan",
  apellidos: "Camacho Montenegro",
  email: "a.camacho@fmagdalena.com",
  password_hash: pass,
  role_id: roles.Propietario.id,
  estado: "Activo",
  tipo: "Fijo",
  protegido: false,
});


  console.log("✅ Seed Básico completado con éxito.");
  console.log(`✅ Roles: ${Object.keys(roles).length}`);
  console.log(`✅ Unidades: ${unidadesBase.length}`);
  console.log(`✅ TiposActividad: ${listaTipos.length}`);
  console.log("✅ Usuario Propietario: germanvillacis@fincalamagdalena.com (pass: 123456)");
};
