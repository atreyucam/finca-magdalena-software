// backend/src/modules/inventario/inventario.controller.js
const service = require('./inventario.service');
const serviceUnidades = require('./unidades.service');
const { models } = require('../../db');

exports.crearItem = async (req, res, next) => { try { res.status(201).json(await service.crearItem(req.body)); } catch (e){ next(e);} };
exports.listarItems = async (req, res, next) => { try { res.json(await service.listarItems(req.query)); } catch (e){ next(e);} };
exports.editarItem = async (req, res, next) => { try { res.json(await service.editarItem(+req.params.id, req.body)); } catch (e){ next(e);} };
exports.ajustarStock = async (req, res, next) => { try { res.status(201).json(await service.ajustarStock(req.user, +req.params.id, req.body)); } catch (e){ next(e);} };
exports.listarMovimientos = async (req, res, next) => { try { res.json(await service.listarMovimientos(req.query)); } catch (e){ next(e);} };
exports.prestarHerramienta = async (req, res, next) => { try { res.status(201).json(await service.prestarHerramienta(req.user, +req.params.id, req.body)); } catch (e){ next(e);} };
exports.devolverHerramienta = async (req, res, next) => { try { res.json(await service.devolverHerramienta(req.user, +req.params.id, req.body)); } catch (e){ next(e);} };
exports.listarNoDevueltas = async (req, res, next) => { try { res.json(await service.listarNoDevueltas()); } catch (e){ next(e);} };
exports.alertasStockBajo = async (req, res, next) => { try { res.json(await service.alertasStockBajo()); } catch (e){ next(e);} };

exports.listar = async (req, res, next) => {
  try {
    const { q, categoria } = req.query;
    const data = await serviceUnidades.listarUnidades({ q, categoria });
    res.json(data);
  } catch (e) {
    next(e);
  }
};
// ✅ FIX: Resumen usando los modelos directamente
exports.getResumen = async (req, res, next) => {
  try {
    const [total, insumos, herramientas, equipos] = await Promise.all([
      models.InventarioItem.count({ where: { activo: true } }),
      models.InventarioItem.count({ where: { categoria: 'Insumo', activo: true } }),
      models.InventarioItem.count({ where: { categoria: 'Herramienta', activo: true } }),
      models.InventarioItem.count({ where: { categoria: 'Equipo', activo: true } })
    ]);
    res.json({ total, insumos, herramientas, equipos });
  } catch (e) { next(e); }
};

exports.editarLote = async (req, res, next) => {
  try {
    res.json(await service.editarLote(+req.params.loteId, req.body));
  } catch (e) {
    next(e);
  }
};

exports.buscarLote = async (req, res, next) => {
  try {
    const itemId = +req.params.id;
    const { codigo, fecha_vencimiento } = req.query;
    res.json(await service.buscarLote(itemId, { codigo, fecha_vencimiento }));
  } catch (e) {
    next(e);
  }
};
