const express = require('express');
const router = express.Router();
const incidentController = require('../controllers/incidentController');
const { 
  authenticate, 
  authorize, 
  requireAssignedOfficer, 
  requireIncidentRequester,
  requireIncidentOwnership,
  canViewIncident
} = require('../middleware/auth');
const { sanitizeInput, validateObjectId, validateCoordinates } = require('../middleware/validation');
const { USER_ROLES } = require('../utils/constants');
const { incidentCreationLimiter } = require('../middleware/rateLimit');

// TODAS las rutas requieren autenticación
router.use(authenticate);

// GET /api/incidents - Listar incidentes (con filtros por ownership)
router.get('/', 
  incidentController.getIncidents
);

// GET /api/incidents/stats/summary - Estadísticas (SOLO ADMIN/OPERATOR)
router.get('/stats/summary', 
  authorize(USER_ROLES.ADMIN, USER_ROLES.OPERATOR),
  incidentController.getIncidentStats
);

// POST /api/incidents - Crear nuevo incidente
router.post('/', 
  incidentCreationLimiter,
  sanitizeInput,
  validateCoordinates,
  incidentController.createIncident
);

// GET /api/incidents/:id - Obtener incidente por ID
router.get('/:id', 
  validateObjectId,
  canViewIncident,
  incidentController.getIncidentById
);

// POST /api/incidents/:id/assign - Asignar oficial (SOLO ADMIN/OPERATOR)
router.post('/:id/assign', 
  validateObjectId,
  authorize(USER_ROLES.ADMIN, USER_ROLES.OPERATOR),
  sanitizeInput,
  incidentController.assignOfficer
);

// POST /api/incidents/:id/auto-assign - Asignación automática (SOLO ADMIN/OPERATOR)
router.post('/:id/auto-assign', 
  validateObjectId,
  authorize(USER_ROLES.ADMIN, USER_ROLES.OPERATOR),
  sanitizeInput,
  incidentController.autoAssignOfficer
);

// POST /api/incidents/:id/accept - Aceptar asignación (OFICIAL ASIGNADO)
router.post('/:id/accept', 
  validateObjectId,
  requireAssignedOfficer,
  sanitizeInput,
  incidentController.acceptAssignment
);

// POST /api/incidents/:id/start-travel - Oficial en camino (OFICIAL ASIGNADO)
router.post('/:id/start-travel', 
  validateObjectId,
  requireAssignedOfficer,
  sanitizeInput,
  incidentController.startTravel
);

// POST /api/incidents/:id/mark-arrived - Oficial llegó al lugar (OFICIAL ASIGNADO)
router.post('/:id/mark-arrived', 
  validateObjectId,
  requireAssignedOfficer,
  sanitizeInput,
  incidentController.markArrived
);

// ✅ CORREGIDO: RUTAS DE RESOLUCIÓN CON AUTENTICACIÓN Y AUTORIZACIÓN
router.patch('/:id/resolve', 
  validateObjectId,
  authenticate, // ✅ MIDDLEWARE DE AUTENTICACIÓN AGREGADO
  authorize(USER_ROLES.ADMIN, USER_ROLES.OPERATOR, USER_ROLES.OFFICER), // ✅ ROLES AUTORIZADOS
  sanitizeInput,
  incidentController.resolveIncident
);

router.post('/:id/resolve', 
  validateObjectId,
  authenticate, // ✅ MIDDLEWARE DE AUTENTICACIÓN AGREGADO
  authorize(USER_ROLES.ADMIN, USER_ROLES.OPERATOR, USER_ROLES.OFFICER), // ✅ ROLES AUTORIZADOS
  sanitizeInput,
  incidentController.resolveIncident
);

// PUT /api/incidents/:id/location - Actualizar ubicación del solicitante (SOLICITANTE)
router.put('/:id/location', 
  validateObjectId,
  requireIncidentRequester,
  sanitizeInput,
  validateCoordinates,
  incidentController.updateRequesterLocation
);

// GET /api/incidents/:id/nearby-officers - Buscar oficiales cercanos
router.get('/:id/nearby-officers', 
  validateObjectId,
  authorize(USER_ROLES.ADMIN, USER_ROLES.OPERATOR),
  incidentController.getNearbyOfficers
);

// PUT /api/incidents/:id/rating - Calificar incidente (SOLICITANTE)
router.put('/:id/rating', 
  validateObjectId,
  requireIncidentRequester,
  sanitizeInput,
  incidentController.rateIncident
);

module.exports = router;