const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { verifyToken, authorizeRoles } = require('../middlewares/auth.middleware');
const { requireFeature } = require('../utils/plans');

router.use(verifyToken, authorizeRoles('bakery', 'admin'));

router.get('/summary', requireFeature('stats'), reportController.summary);                  // Pro y Premium
router.get('/sales', requireFeature('stats'), reportController.sales);                      // Pro y Premium
router.get('/advanced', requireFeature('advancedReports'), reportController.advanced);      // Premium
router.get('/export', requireFeature('export'), reportController.exportData);               // Pro y Premium

module.exports = router;
