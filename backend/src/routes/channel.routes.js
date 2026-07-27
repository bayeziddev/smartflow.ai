const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const controller = require('../controllers/channelController');

const router = express.Router();

router.use(requireAuth);
router.get('/', controller.listChannels);
router.post('/:channel/toggle', controller.toggleChannel);
router.get('/whatsapp/qr', controller.getWhatsappQr);
router.post('/:channel/credentials', controller.saveOfficialCredentials);

module.exports = router;
