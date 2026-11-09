const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { verifyToken, authorizeRoles } = require('../middlewares/auth.middleware');

router.get('/', productController.getProducts);
router.get('/popular', productController.getPopularProducts);
router.post('/', verifyToken, authorizeRoles('bakery', 'admin'), productController.createProduct);
router.put('/:id', verifyToken, authorizeRoles('bakery', 'admin'), productController.updateProduct);
router.delete('/:id', verifyToken, authorizeRoles('bakery', 'admin'), productController.deleteProduct);

module.exports = router;