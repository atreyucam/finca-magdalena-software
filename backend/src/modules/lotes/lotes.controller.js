const service = require('./lotes.services');

exports.crearLote = async (req, res, next) => {
try { res.status(201).json(await service.crearLote(req.body)); }
catch (err) { next(err); }
};


exports.listarLotes = async (req, res, next) => {
try { res.json(await service.listarLotes()); }
catch (err) { next(err); }
};


exports.obtenerLote = async (req, res, next) => {
try {
const out = await service.obtenerLote(+req.params.id);
if (!out) return res.status(404).json({ message: 'No encontrado' });
res.json(out);
} catch (err) { next(err); }
};


exports.editarLote = async (req, res, next) => {
try { res.json(await service.editarLote(+req.params.id, req.body)); }
catch (err) { next(err); }
};