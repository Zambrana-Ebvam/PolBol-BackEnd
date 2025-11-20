const express = require('express');
const router = express.Router();
const emergencyTypeController = require('../controllers/emergencyTypeController');
const { authenticate, authorize } = require('../middleware/auth');
const { sanitizeInput } = require('../middleware/validation');
const { USER_ROLES } = require('../utils/constants');

// Rutas públicas
router.get('/', emergencyTypeController.getEmergencyTypes);
router.get('/categories/list', emergencyTypeController.getEmergencyTypeCategories);
router.get('/operational/active', emergencyTypeController.getActiveOperationalTypes);
router.get('/:code', emergencyTypeController.getEmergencyTypeByCode);

// Rutas protegidas - Requieren autenticación
router.use(authenticate);

// POST /api/emergency-types - Crear tipo de emergencia (SOLO ADMIN/OPERATOR)
router.post('/', 
  authorize(USER_ROLES.ADMIN, USER_ROLES.OPERATOR),
  sanitizeInput,
  emergencyTypeController.createEmergencyType
);

// PUT /api/emergency-types/:code - Actualizar tipo de emergencia (SOLO ADMIN/OPERATOR)
router.put('/:code', 
  authorize(USER_ROLES.ADMIN, USER_ROLES.OPERATOR),
  sanitizeInput,
  emergencyTypeController.updateEmergencyType
);

// DELETE /api/emergency-types/:code - Desactivar tipo de emergencia (SOLO ADMIN)
router.delete('/:code', 
  authorize(USER_ROLES.ADMIN),
  sanitizeInput,
  emergencyTypeController.deactivateEmergencyType
);

// PATCH /api/emergency-types/:code/activate - Reactivar tipo de emergencia (SOLO ADMIN)
router.patch('/:code/activate', 
  authorize(USER_ROLES.ADMIN),
  sanitizeInput,
  emergencyTypeController.activateEmergencyType
);

// GET /api/emergency-types/stats/usage - Estadísticas (SOLO ADMIN/OPERATOR)
router.get('/stats/usage', 
  authorize(USER_ROLES.ADMIN, USER_ROLES.OPERATOR),
  emergencyTypeController.getEmergencyTypeUsageStats
);

// GET /api/emergency-types/:code/incidents - Incidentes por tipo (SOLO ADMIN/OPERATOR)
router.get('/:code/incidents', 
  authorize(USER_ROLES.ADMIN, USER_ROLES.OPERATOR),
  emergencyTypeController.getIncidentsByEmergencyType
);

// POST /api/emergency-types/:code/record-usage - Registrar uso (INTERNO)
router.post('/:code/record-usage', 
  authorize(USER_ROLES.ADMIN, USER_ROLES.OPERATOR),
  sanitizeInput,
  emergencyTypeController.recordEmergencyTypeUsage
);

module.exports = router;