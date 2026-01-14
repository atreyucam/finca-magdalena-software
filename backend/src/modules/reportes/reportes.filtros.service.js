const { Op } = require("sequelize");
const { models } = require("../../db");

function badRequest(msg) { const e = new Error(msg); e.status = 400; return e; }

// helper: parseo seguro para ids
function parseId(v, fieldName = "id") {
  const raw = String(v ?? "").trim();
  const n = Number(raw);
  if (!raw || !Number.isFinite(n) || n <= 0) {
    throw badRequest(`${fieldName} es requerido.`);
  }
  return n;
}

exports.listarFincas = async (_currentUser) => {
  const rows = await models.Finca.findAll({
    where: { estado: "Activo" },
    attributes: ["id", "nombre", "ubicacion", "estado"],
    order: [["nombre", "ASC"]],
  });

  return rows.map(f => f.toJSON());
};

exports.listarLotesPorFinca = async (_currentUser, query) => {
  const fincaId = parseId(query?.finca_id, "finca_id");

  const rows = await models.Lote.findAll({
    where: { finca_id: fincaId, estado: "Activo" },
    attributes: ["id", "nombre", "superficie_ha", "numero_plantas", "fecha_siembra", "estado"],
    order: [["nombre", "ASC"]],
  });

  return rows.map(l => l.toJSON());
};

exports.listarCosechasPorFinca = async (_currentUser, query) => {
  const fincaId = parseId(query?.finca_id, "finca_id");

  const rows = await models.Cosecha.findAll({
    where: { finca_id: fincaId },
    attributes: ["id", "nombre", "codigo", "anio_agricola", "fecha_inicio", "fecha_fin", "estado", "created_at"],
    order: [
      ["estado", "ASC"],
      ["fecha_inicio", "DESC"],
      ["id", "DESC"],
    ],
  });

  const data = rows.map(c => c.toJSON());

  const activa = data.find(c => c.estado === "Activa") || null;

  const ordenadas = [
    ...(activa ? [activa] : []),
    ...data
      .filter(c => !activa || c.id !== activa.id)
      .sort((a, b) => {
        const da = a.fecha_inicio ? new Date(a.fecha_inicio).getTime() : 0;
        const db = b.fecha_inicio ? new Date(b.fecha_inicio).getTime() : 0;
        return db - da;
      })
  ];

  return {
    finca_id: fincaId,
    cosecha_activa_id: activa?.id || null,
    data: ordenadas
  };
};
