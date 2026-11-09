const express = require('express');
const router = express.Router();
const settingController = require('../controllers/setting.controller');
const { verifyToken, authorizeRoles } = require('../middlewares/auth.middleware');

router.get('/public', settingController.getPublicSettings);
router.get('/', verifyToken, authorizeRoles('admin'), settingController.getSettings);
router.put('/', verifyToken, authorizeRoles('admin'), settingController.updateSettings);

module.exports = router;