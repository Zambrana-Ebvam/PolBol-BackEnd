const rateLimit = require('express-rate-limit');

// Rate limiting para login
exports.loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    error: 'Demasiados intentos de login. Intente nuevamente en 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting para refresh token ★★ NECESARIO ★★
exports.refreshTokenLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, 
  max: 10,
  message: {
    success: false,
    error: 'Demasiados intentos de refresh token. Espere unos minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting para creación de incidentes
exports.incidentCreationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  message: {
    success: false,
    error: 'Demasiados incidentes creados. Espere un momento.'
  }
});

// Rate limiting general para API
exports.apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: 'Demasiadas solicitudes. Intente nuevamente en 15 minutos.'
  }
});
