const { models } = require('../../db');


function badRequest(message = 'Solicitud inválida') { const e = new Error(message); e.status = 400; e.code = 'BAD_REQUEST'; return e; }


exports.crearLote = async (data) => {
const { nombre, superficie_ha, numero_plantas, fecha_siembra, estado } = data;
if (!nombre) throw badRequest('nombre es obligatorio');
const defaults = {
nombre,
superficie_ha: superficie_ha ?? 0,
numero_plantas: numero_plantas ?? 0,
fecha_siembra: fecha_siembra || null,
estado: estado || 'Activo',
};
try {
const l = await models.Lote.create(defaults);
return l.toJSON();
} catch (err) {
if (err.name === 'SequelizeUniqueConstraintError') { err.status = 409; err.code = 'DUPLICATE'; err.message = 'El nombre de lote ya existe'; }
throw err;
}
};


exports.listarLotes = async () => {
const list = await models.Lote.findAll({ order: [['created_at','DESC']] });
return list.map(l => l.toJSON());
};


exports.obtenerLote = async (id) => {
const l = await models.Lote.findByPk(id);
return l ? l.toJSON() : null;
};


exports.editarLote = async (id, data) => {
const l = await models.Lote.findByPk(id);
if (!l) { const e = new Error('Lote no encontrado'); e.status = 404; throw e; }
const fields = ['nombre','superficie_ha','numero_plantas','fecha_siembra','estado'];
for (const f of fields) if (f in data) l[f] = data[f];
try {
await l.save();
return l.toJSON();
} catch (err) {
if (err.name === 'SequelizeUniqueConstraintError') { err.status = 409; err.code = 'DUPLICATE'; err.message = 'El nombre de lote ya existe'; }
throw err;
}
};