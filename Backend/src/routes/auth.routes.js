const express = require('express');
const { body, validationResult } = require('express-validator');
const authController = require('../controllers/auth.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

const router = express.Router();

// Middleware rápido para retornar errores de validación
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ ok: false, errors: errors.array() });
  }
  next();
};

router.post(
  '/register',
  // 1. Solo reglas de validación dentro del arreglo
  [
    body('name').notEmpty().withMessage('El nombre es obligatorio'),
    body('email').isEmail().withMessage('Debe ser un correo válido'),
    body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener mínimo 6 caracteres')
  ],
  // 2. 'validate' va afuera como middleware independiente
  validate,
  authController.register
);

router.post(
  '/login',
  // 1. Solo reglas de validación dentro del arreglo
  [
    body('email').isEmail().withMessage('Correo inválido'),
    body('password').notEmpty().withMessage('La contraseña es requerida')
  ],
  // 2. 'validate' va afuera como middleware independiente
  validate,
  authController.login
);

router.get('/me', verifyToken, authController.getMe);

module.exports = router;