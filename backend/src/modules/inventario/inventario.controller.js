// backend/src/modules/inventario/inventario.controller.js
const service = require('./inventario.service');


exports.crearItem = async (req, res, next) => { try { res.status(201).json(await service.crearItem(req.body)); } catch (e){ next(e);} };
exports.listarItems = async (req, res, next) => { try { res.json(await service.listarItems(req.query)); } catch (e){ next(e);} };
exports.editarItem = async (req, res, next) => { try { res.json(await service.editarItem(+req.params.id, req.body)); } catch (e){ next(e);} };
exports.ajustarStock = async (req, res, next) => { try { res.status(201).json(await service.ajustarStock(req.user, +req.params.id, req.body)); } catch (e){ next(e);} };
exports.listarMovimientos = async (req, res, next) => { try { res.json(await service.listarMovimientos(req.query)); } catch (e){ next(e);} };
exports.prestarHerramienta = async (req, res, next) => { try { res.status(201).json(await service.prestarHerramienta(req.user, +req.params.id, req.body)); } catch (e){ next(e);} };
exports.devolverHerramienta = async (req, res, next) => { try { res.json(await service.devolverHerramienta(req.user, +req.params.id, req.body)); } catch (e){ next(e);} };
exports.listarNoDevueltas = async (req, res, next) => { try { res.json(await service.listarNoDevueltas()); } catch (e){ next(e);} };
exports.alertasStockBajo = async (req, res, next) => { try { res.json(await service.alertasStockBajo()); } catch (e){ next(e);} };