const { Router } = require('express');
const router = Router();
router.get('/', (req, res) => res.json({ ok: true, ts: Date.now() }));
module.exports = router;