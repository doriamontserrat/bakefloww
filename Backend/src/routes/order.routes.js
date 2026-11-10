const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const { verifyToken, authorizeRoles } = require('../middlewares/auth.middleware');

router.use(verifyToken);

router.get('/', orderController.getOrders);
router.post('/', authorizeRoles('customer', 'admin', 'bakery', 'employee'), orderController.createOrder);
router.patch('/:id/quote', authorizeRoles('bakery', 'admin'), orderController.quoteOrder);
router.patch('/:id/reject', authorizeRoles('bakery', 'admin'), orderController.rejectOrder);
router.patch('/:id/cancel', authorizeRoles('customer'), orderController.cancelOwnOrder);
router.patch('/:id/respond', authorizeRoles('customer'), orderController.respondToQuote);
router.put('/:id', authorizeRoles('bakery', 'employee', 'admin'), orderController.updateOrder);
router.delete('/:id', authorizeRoles('bakery', 'admin'), orderController.deleteOrder);

module.exports = router;