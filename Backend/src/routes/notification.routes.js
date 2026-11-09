const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { verifyToken, authorizeRoles } = require('../middlewares/auth.middleware');

router.use(verifyToken);

router.get('/', notificationController.getMyNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.patch('/read-all', notificationController.markAllAsRead);
router.get('/all', authorizeRoles('admin'), notificationController.getAllNotifications);
router.post('/', authorizeRoles('admin', 'bakery', 'employee'), notificationController.createNotification);
router.patch('/:id/read', notificationController.markAsRead);

module.exports = router;
