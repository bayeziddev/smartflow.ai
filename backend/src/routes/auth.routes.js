const express = require('express');
const controller = require('../controllers/authController');

const router = express.Router();

router.post('/register', controller.register);
router.post('/login', controller.login);
router.get('/manus/login', controller.manusLogin);
router.get('/manus/callback', controller.manusCallback);

module.exports = router;
