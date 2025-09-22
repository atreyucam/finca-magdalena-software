const service = require('./metricas.service');

exports.agua = async (req, res, next) => {
  try {
    const { lote_id, tarea_id, desde, hasta, unidad = 'L' } = req.query;
    const out = await service.aguaUsada({
      lote_id: lote_id ? +lote_id : undefined,
      tarea_id: tarea_id ? +tarea_id : undefined,
      desde, hasta,
      unidad: (unidad || 'L').toUpperCase()
    });
    res.json(out);
  } catch (e) { next(e); }
};

exports.insumos = async (req, res, next) => {
  try {
    const { lote_id, desde, hasta } = req.query;
    const out = await service.consumoInsumos({
      lote_id: lote_id ? +lote_id : undefined,
      desde, hasta
    });
    res.json(out);
  } catch (e) { next(e); }
};

exports.tareas = async (req, res, next) => {
  try {
    const { lote_id, desde, hasta } = req.query;
    const out = await service.tareasStats({
      lote_id: lote_id ? +lote_id : undefined,
      desde, hasta
    });
    res.json(out);
  } catch (e) { next(e); }
};
