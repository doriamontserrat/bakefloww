const express = require('express');
const { body, validationResult } = require('express-validator');
const authController = require('../controllers/auth.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const v = require('../utils/validators');

// Adaptador: convierte un validador propio (devuelve mensaje o '') en regla de express-validator
const rule = (field, fn) => body(field).custom((value) => { const msg = fn(value); if (msg) throw new Error(msg); return true; });

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
    rule('name', (x) => v.validateName(x)),
    rule('email', v.validateEmail),
    rule('password', v.validatePassword),
    body('phone').optional({ values: 'falsy' }).custom((x) => { const m = v.validatePhone(x); if (m) throw new Error(m); return true; }),
    body('address').optional({ values: 'falsy' }).custom((x) => { const m = v.validateAddress(x); if (m) throw new Error(m); return true; }),
    body('birthday').optional({ values: 'falsy' }).custom((x) => { const m = v.validateBirthday(x); if (m) throw new Error(m); return true; }),
    body('bakeryName').optional({ values: 'falsy' }).custom((x) => { const m = v.validateTitle(x, 'El nombre de la pastelería'); if (m) throw new Error(m); return true; })
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