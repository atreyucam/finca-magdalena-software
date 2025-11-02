const service = require('./usuarios.service');

exports.crearUsuario = async (req, res, next) => {
try {
const data = req.body;
const result = await service.crearUsuario(req.user, data);
res.status(201).json(result);
} catch (err) { next(err); }
};


exports.listarUsuarios = async (req, res, next) => {
try {
const { q, estado,role, page = 1, pageSize = 20 } = req.query;
const result = await service.listarUsuarios({ q, estado, role, page: +page, pageSize: +pageSize });
res.json(result);
} catch (err) { next(err); }
};


exports.obtenerUsuario = async (req, res, next) => {
try {
const { id } = req.params;
const result = await service.obtenerUsuario(+id);
if (!result) return res.status(404).json({ message: 'No encontrado' });
res.json(result);
} catch (err) { next(err); }
};


exports.editarUsuario = async (req, res, next) => {
try {
const { id } = req.params;
const data = req.body;
const result = await service.editarUsuario(req.user, +id, data);
res.json(result);
} catch (err) { next(err); }
};


exports.desactivarUsuario = async (req, res, next) => {
try {
const { id } = req.params;
const result = await service.desactivarUsuario(req.user, +id);
res.json(result);
} catch (err) { next(err); }
};


exports.obtenerEstadisticas = async (req, res, next) => {
  try {
    res.json(await service.obtenerEstadisticas());
  } catch (err) { next(err); }
};


exports.obtenerPagosUsuario = async (req, res, next) => {
  try {
    res.json(await service.obtenerPagosUsuario(+req.params.id));
  } catch (err) { next(err); }
};


exports.obtenerTareasUsuario = async (req, res, next) => {
  try {
    res.json(await service.obtenerTareasUsuario(+req.params.id));
  } catch (err) { next(err); }
};



exports.obtenerMiUsuario = async (req, res, next) => {
  try {
    const me = await service.obtenerUsuario(+req.user.sub);
    if (!me) return res.status(404).json({ message: 'No encontrado' });
    res.json(me);
  } catch (err) { next(err); }
};

exports.obtenerMisPagos = async (req, res, next) => {
  try {
    // Reusa el servicio existente
    const datos = await service.obtenerPagosUsuario(+req.user.sub);
    res.json(datos);
  } catch (err) { next(err); }
};

exports.obtenerMisTareas = async (req, res, next) => {
  try {
    const datos = await service.obtenerTareasUsuario(+req.user.sub);
    res.json(datos);
  } catch (err) { next(err); }
};