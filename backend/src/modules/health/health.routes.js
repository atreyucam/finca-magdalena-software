const { Router } = require('express');
const router = Router();
router.get('/', (req, res) => {
  res.json({
    ok: true,
    ts: Date.now(),
    uptime_s: Math.round(process.uptime()),
  });
});
module.exports = router;
