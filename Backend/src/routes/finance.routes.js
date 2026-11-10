const express = require('express');
const router = express.Router();
const financeController = require('../controllers/finance.controller');
const { verifyToken, authorizeRoles } = require('../middlewares/auth.middleware');

const { requireFeature } = require('../utils/plans');

router.use(verifyToken);

// Control financiero: planes Pro y Premium (el plan gratuito recibe 403 PLAN_REQUIRED)
router.get('/', authorizeRoles('bakery', 'admin'), requireFeature('finance'), financeController.getFinances);
router.post('/', authorizeRoles('bakery', 'admin'), requireFeature('finance'), financeController.createFinanceRecord);
router.get('/metrics', authorizeRoles('bakery', 'admin'), requireFeature('finance'), financeController.getFinanceMetrics);
router.delete('/:id', authorizeRoles('bakery', 'admin'), requireFeature('finance'), financeController.deleteFinanceRecord);


module.exports = router;