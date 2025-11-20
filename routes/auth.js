const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { loginLimiter, refreshTokenLimiter } = require('../middleware/rateLimit'); // ✅ NUEVO: refreshTokenLimiter
const { sanitizeInput } = require('../middleware/validation');

// POST /api/auth/login
router.post('/login', 
  loginLimiter, 
  sanitizeInput, 
  authController.login
);

// POST /api/auth/refresh
router.post('/refresh', 
  refreshTokenLimiter, // ✅ NUEVO: Rate limiting para refresh tokens
  sanitizeInput, 
  authController.refreshToken
);

// POST /api/auth/logout
router.post('/logout', 
  authenticate, 
  authController.logout
);

// GET /api/auth/me
router.get('/me', 
  authenticate, 
  authController.getProfile
);

// POST /api/auth/change-password
router.post('/change-password', 
  authenticate, 
  sanitizeInput, 
  authController.changePassword
);

module.exports = router;