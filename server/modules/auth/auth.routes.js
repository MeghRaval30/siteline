const express = require('express');
const { z } = require('zod');
const authController = require('./auth.controller');
const authenticate = require('../../shared/authenticate');

const router = express.Router();

const signupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const validate = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', details: error.errors });
  }
};

router.post('/signup', validate(signupSchema), authController.signup);
router.post('/login', validate(loginSchema), authController.login);
router.get('/me', authenticate, authController.getMe);

module.exports = router;
