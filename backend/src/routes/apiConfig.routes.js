const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const controller = require('../controllers/apiConfigController');

const router = express.Router();

router.use(requireAuth);
router.get('/keys', controller.listKeys);
router.post('/keys', controller.saveKey);
router.patch('/keys/:provider', controller.toggleKey);
router.delete('/keys/:provider', controller.deleteKey);

module.exports = router;
