const { Router } = require('express');
const controller = require('./auth.controller');
const router = Router();


router.post('/login', controller.login);
router.post('/refresh', controller.refresh);

module.exports = router;