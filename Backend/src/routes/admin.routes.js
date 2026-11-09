const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { verifyToken, authorizeRoles } = require('../middlewares/auth.middleware');

router.use(verifyToken, authorizeRoles('admin'));

router.get('/overview', adminController.getOverview);
router.get('/stats', adminController.getStats);
router.get('/transactions', adminController.getTransactions);

module.exports = router;