const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const controller = require('../controllers/chatController');

const router = express.Router();

router.use(requireAuth);
router.post('/', controller.chat);

module.exports = router;
