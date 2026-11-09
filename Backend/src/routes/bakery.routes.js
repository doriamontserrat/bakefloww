const express = require('express');
const router = express.Router();
const bakeryController = require('../controllers/bakery.controller');
const { verifyToken, authorizeRoles, optionalAuth } = require('../middlewares/auth.middleware');

router.get('/', optionalAuth, bakeryController.getBakeries);
router.get('/:id', optionalAuth, bakeryController.getBakeryById);
router.post('/', verifyToken, authorizeRoles('bakery', 'admin'), bakeryController.createBakery);
router.put('/:id/subscription', verifyToken, authorizeRoles('bakery', 'admin'), bakeryController.updateSubscription);
router.put('/:id', verifyToken, authorizeRoles('bakery', 'admin'), bakeryController.updateBakery);
router.delete('/:id', verifyToken, authorizeRoles('admin'), bakeryController.deleteBakery);

module.exports = router;