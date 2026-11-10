const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const { verifyToken, optionalAuth, authorizeRoles } = require('../middlewares/auth.middleware');

router.get('/', optionalAuth, categoryController.getCategories);
router.post('/', verifyToken, authorizeRoles('bakery'), categoryController.createCategory);
router.put('/:id', verifyToken, authorizeRoles('bakery', 'admin'), categoryController.updateCategory);
router.delete('/:id', verifyToken, authorizeRoles('bakery', 'admin'), categoryController.deleteCategory);

module.exports = router;
