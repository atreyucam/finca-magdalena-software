// backend/src/modules/reportes/reportes.controller.js
const service = require("./reportes.service");

exports.reporteTareas = async (req, res, next) => {
  try {
    const out = await service.reporteTareas(req.user, req.query);
    res.json(out);
  } catch (e) { next(e); }
};

