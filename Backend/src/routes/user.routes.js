const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { verifyToken, authorizeRoles } = require('../middlewares/auth.middleware');

router.use(verifyToken);

router.get('/', authorizeRoles('admin', 'bakery'), userController.getUsers);
router.post('/', authorizeRoles('admin'), userController.createUser);
router.post('/verify-credentials', userController.verifyCredentials);
router.put('/profile', userController.updateProfile);
router.put('/password', userController.changePassword);
router.post('/cards', authorizeRoles('customer', 'bakery', 'admin'), userController.addCard);
router.delete('/cards/:cardId', authorizeRoles('customer', 'bakery', 'admin'), userController.removeCard);
router.post('/authorize-supervisor', authorizeRoles('employee'), userController.authorizeSupervisor);
router.put('/employees/:id', authorizeRoles('bakery', 'admin'), userController.updateEmployee);
router.post('/employees', authorizeRoles('bakery', 'admin'), userController.createEmployee);
router.patch('/:id/status', authorizeRoles('admin'), userController.updateUserStatus);
router.delete('/:id', authorizeRoles('admin', 'bakery'), userController.deleteUser);

module.exports = router;