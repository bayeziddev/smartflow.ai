const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const controller = require('../controllers/orderController');

const router = express.Router();

router.use(requireAuth);
// IMPORTANT: the specific "export.xlsx" route must be declared before
// the (nonexistent here, but easy to add later) "/:id" style routes
// to avoid Express matching "export.xlsx" as an :id param.
router.get('/export.xlsx', controller.exportOrders);
router.get('/', controller.listOrders);

module.exports = router;
