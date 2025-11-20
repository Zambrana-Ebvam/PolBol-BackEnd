const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize, requireOwnershipOrPermission } = require('../middleware/auth');
const { sanitizeInput, validateObjectId } = require('../middleware/validation');
const { USER_ROLES } = require('../utils/constants');

// TODAS las rutas requieren autenticación
router.use(authenticate);

// GET /api/users - Listar usuarios (SOLO ADMIN/OPERATOR)
router.get('/', 
  authorize(USER_ROLES.ADMIN, USER_ROLES.OPERATOR),
  userController.getUsers
);

// GET /api/users/profile/me - Obtener perfil del usuario autenticado
router.get('/profile/me', 
  userController.getMyProfile
);

// GET /api/users/:id - Obtener usuario por ID
router.get('/:id', 
  validateObjectId,
  requireOwnershipOrPermission('id', 'MANAGE_USERS'),
  userController.getUserById
);

// POST /api/users - Crear nuevo usuario (SOLO ADMIN)
router.post('/', 
  authorize(USER_ROLES.ADMIN),
  sanitizeInput,
  userController.createUser
);

// PUT /api/users/:id - Actualizar usuario completo
router.put('/:id', 
  validateObjectId,
  requireOwnershipOrPermission('id', 'MANAGE_USERS'),
  sanitizeInput,
  userController.updateUser
);

// PATCH /api/users/:id/availability - Actualizar disponibilidad de oficial
router.patch('/:id/availability', 
  validateObjectId,
  requireOwnershipOrPermission('id', 'ASSIGN_OFFICERS'),
  sanitizeInput,
  userController.updateAvailability
);

// PATCH /api/users/:id/activate - Reactivar usuario (SOLO ADMIN)
router.patch('/:id/activate', 
  validateObjectId,
  authorize(USER_ROLES.ADMIN),
  userController.activateUser
);

// DELETE /api/users/:id - Desactivar usuario (SOLO ADMIN)
router.delete('/:id', 
  validateObjectId,
  authorize(USER_ROLES.ADMIN),
  userController.deactivateUser
);

// PATCH /api/users/:id/password - Cambiar contraseña
router.patch('/:id/password', 
  validateObjectId,
  requireOwnershipOrPermission('id'),
  sanitizeInput,
  userController.changeUserPassword
);

// GET /api/users/:id/location - Obtener ubicación de usuario
router.get('/:id/location', 
  validateObjectId,
  requireOwnershipOrPermission('id', 'ACCESS_MAP'),
  userController.getUserLocation
);

// GET /api/users/stats/summary - Estadísticas (SOLO ADMIN/OPERATOR)
router.get('/stats/summary', 
  authorize(USER_ROLES.ADMIN, USER_ROLES.OPERATOR),
  userController.getUserStats
);

// GET /api/users/search/officers - Búsqueda de oficiales
router.get('/search/officers', 
  authorize(USER_ROLES.ADMIN, USER_ROLES.OPERATOR, USER_ROLES.OFFICER),
  userController.searchOfficers
);

module.exports = router;