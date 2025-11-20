const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');
const { authenticate, authorize, requireOwnershipOrPermission } = require('../middleware/auth');
const { sanitizeInput, validateCoordinates, validateObjectId } = require('../middleware/validation');
const { USER_ROLES } = require('../utils/constants');

// TODAS las rutas requieren autenticación
router.use(authenticate);

// POST /api/locations - Actualizar ubicación de usuario
router.post('/', 
  sanitizeInput,
  validateCoordinates,
  locationController.updateLocation
);

// GET /api/locations/nearby - Buscar oficiales cercanos
router.get('/nearby', 
  locationController.getNearbyOfficers
);

// GET /api/locations - Listar ubicaciones (SOLO ADMIN/OPERATOR)
router.get('/', 
  authorize(USER_ROLES.ADMIN, USER_ROLES.OPERATOR),
  locationController.getLocations
);

// GET /api/locations/user/:userId - Obtener ubicación de usuario específico
router.get('/user/:userId', 
  validateObjectId,
  requireOwnershipOrPermission('userId', 'ACCESS_MAP'),
  locationController.getUserLocation
);

// GET /api/locations/stats/active-officers - Estadísticas de oficiales activos
router.get('/stats/active-officers', 
  authorize(USER_ROLES.ADMIN, USER_ROLES.OPERATOR),
  locationController.getActiveOfficersStats
);

// GET /api/locations/heatmap - Datos para mapa de calor
router.get('/heatmap', 
  authorize(USER_ROLES.ADMIN, USER_ROLES.OPERATOR),
  locationController.getHeatmapData
);

// GET /api/locations/zones/coverage - Cobertura por zonas
router.get('/zones/coverage', 
  authorize(USER_ROLES.ADMIN, USER_ROLES.OPERATOR),
  locationController.getZoneCoverage
);

// DELETE /api/locations/user/:userId - Eliminar ubicación (SOLO ADMIN)
router.delete('/user/:userId', 
  validateObjectId,
  authorize(USER_ROLES.ADMIN),
  locationController.deleteUserLocation
);

// POST /api/locations/bulk-update - Actualización masiva (SOLO ADMIN/OPERATOR)
router.post('/bulk-update', 
  authorize(USER_ROLES.ADMIN, USER_ROLES.OPERATOR),
  sanitizeInput,
  locationController.bulkUpdateLocations
);

module.exports = router;