const { Router } = require('express');
const router = Router();
router.get('/', (req, res) => res.json({ ok: true, ts: Date.now(), ms: "hola"}));
module.exports = router;