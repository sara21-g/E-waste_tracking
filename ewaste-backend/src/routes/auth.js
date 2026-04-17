const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  register, login, logout, getMe,
  refreshToken, verifyEmail,
  forgotPassword, resetPassword
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').optional().isIn(['household', 'recycler', 'ngo']).withMessage('Invalid role'),
  validate
], register);

router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  validate
], login);

router.post('/refresh-token', refreshToken);
router.get('/verify-email/:token', verifyEmail);
router.post('/forgot-password', [
  body('email').isEmail().withMessage('Valid email is required'),
  validate
], forgotPassword);
router.put('/reset-password/:token', [
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  validate
], resetPassword);

// Protected
router.use(protect);
router.post('/logout', logout);
router.get('/me', getMe);

module.exports = router;
