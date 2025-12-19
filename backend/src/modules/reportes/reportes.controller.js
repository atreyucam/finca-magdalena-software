// backend/src/modules/reportes/reportes.controller.js
const service = require('./reportes.service');



exports.rendimientoCosecha = async (req, res, next) => {
  try {
    const { cosecha_id, comparar_id } = req.query;
    // Llamamos al nuevo servicio consolidado
    const data = await service.getRendimientoCosecha({ 
      cosecha_id: cosecha_id ? +cosecha_id : null, 
      comparar_id: comparar_id ? +comparar_id : null 
    });
    res.json(data);
  } catch (e) {
    next(e);
  }
};


// Agregamos los nuevos métodos
exports.fitoSeguridad = async (req, res, next) => {
  try {
    const { finca_id } = req.query;
    if (!finca_id) return res.status(400).json({ message: 'Finca ID es requerido' });
    
    const data = await service.getFitosanitarioStats({ finca_id });
    res.json(data);
  } catch (e) { next(e); }
};

exports.operaciones = async (req, res, next) => {
  try {
    const { finca_id, desde, hasta } = req.query;
    if (!finca_id) return res.status(400).json({ message: 'Finca ID es requerido' });

    const data = await service.getOperacionesStats({ finca_id, desde, hasta });
    res.json(data);
  } catch (e) { next(e); }
};


exports.costosOperativos = async (req, res, next) => {
  try {
    const { finca_id, desde, hasta } = req.query;
    if (!finca_id) return res.status(400).json({ message: 'Finca ID es requerido' });

    const data = await service.getCostosOperativos({ finca_id, desde, hasta });
    res.json(data);
  } catch (e) { next(e); }
};


exports.dashboard = async (req, res, next) => {
  try {
    // Ahora aceptamos finca_id opcional
    const { finca_id } = req.query; 
    const data = await service.getDashboardKPIs({ finca_id });
    res.json(data);
  } catch (e) { next(e); }
};



















// // 1. Dashboard
// exports.dashboard = async (req, res, next) => {
//   try {
//     const data = await service.getDashboardKPIs();
//     res.json(data);
//   } catch (e) { next(e); }
// };

// // 2. Cosecha (Con soporte para comparativa)
// exports.reporteCosecha = async (req, res, next) => {
//   try {
//     const { cosecha_id, comparar_id } = req.query;
//     const data = await service.getCosechaStats({ cosecha_id, comparar_id });
//     res.json(data);
//   } catch (e) { next(e); }
// };

// // 3. Bitácora Lote
// exports.bitacoraLote = async (req, res, next) => {
//   try {
//     const { id } = req.params; // Lote ID
//     const { cosecha_id, limit } = req.query;
//     const data = await service.getBitacoraLote(id, { cosecha_id, limit });
//     res.json(data);
//   } catch (e) { next(e); }
// };

// // 4. Insumos
// exports.reporteInsumos = async (req, res, next) => {
//   try {
//     const { desde, hasta } = req.query;
//     const data = await service.getInsumosStats({ desde, hasta });
//     res.json(data);
//   } catch (e) { next(e); }
// };

// // 5. Pagos
// exports.reportePagos = async (req, res, next) => {
//   try {
//     const { desde, hasta } = req.query;
//     const data = await service.getPagosStats({ desde, hasta });
//     res.json(data);
//   } catch (e) { next(e); }
// };