const express = require('express');
const router = express.Router();
const planController = require('../controllers/plan.controller');
const { verifyToken, authorizeRoles, optionalAuth } = require('../middlewares/auth.middleware');

router.get('/', optionalAuth, planController.getPlans);
router.put('/:key', verifyToken, authorizeRoles('admin'), planController.updatePlan);

module.exports = router;