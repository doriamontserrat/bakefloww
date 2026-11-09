const express = require('express');
const router = express.Router();
const financeController = require('../controllers/finance.controller');
const { verifyToken, authorizeRoles } = require('../middlewares/auth.middleware');

router.use(verifyToken);

router.get('/', authorizeRoles('bakery', 'admin'), financeController.getFinances);
router.post('/', authorizeRoles('bakery', 'admin'), financeController.createFinanceRecord);
router.get('/metrics', authorizeRoles('bakery', 'admin'), financeController.getFinanceMetrics);
router.delete('/:id', authorizeRoles('bakery', 'admin'), financeController.deleteFinanceRecord);


module.exports = router;