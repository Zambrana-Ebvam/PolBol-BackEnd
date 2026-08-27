const router = require("express").Router();
const incidentController = require("../controllers/incident.controller");
const authMiddleware = require("../middlewares/authMiddleware");
const requireRole = require("../middlewares/roleMiddleware");
const { USER_ROLES } = require("../constants/emergencyTypes");

// 1. Crear incidente (CIVIL, ADMIN)
router.post(
  "/",
  authMiddleware,
  requireRole(USER_ROLES.CIVIL, USER_ROLES.ADMIN),
  incidentController.createIncident
);

// 2. Listar incidentes (OPERATOR, ADMIN, OFFICER)
router.get(
  "/",
  authMiddleware,
  requireRole(USER_ROLES.OPERATOR, USER_ROLES.ADMIN, USER_ROLES.OFFICER),
  incidentController.listIncidents
);

// 3. Detalle de un incidente
router.get(
  "/:id",
  authMiddleware,
  incidentController.getIncidentById
);

// 4. Buscar oficiales cercanos al incidente (OPERATOR, ADMIN)
router.get(
  "/:id/nearby-officers",
  authMiddleware,
  requireRole(USER_ROLES.OPERATOR, USER_ROLES.ADMIN),
  incidentController.getNearbyOfficersForIncident
);

// 5. Asignar oficial al incidente (OPERATOR, ADMIN)
router.post(
  "/:id/assign",
  authMiddleware,
  requireRole(USER_ROLES.OPERATOR, USER_ROLES.ADMIN),
  incidentController.assignOfficer
);

// 6. Oficial acepta el incidente (OFFICER)
router.post(
  "/:id/accept",
  authMiddleware,
  requireRole(USER_ROLES.OFFICER),
  incidentController.acceptIncident
);

// 7. Oficial marca llegada al incidente (OFFICER)
router.post(
  "/:id/arrive",
  authMiddleware,
  requireRole(USER_ROLES.OFFICER),
  incidentController.arriveIncident
);

// 8. Resolver incidente (OFFICER, OPERATOR, ADMIN)
router.post(
  "/:id/resolve",
  authMiddleware,
  requireRole(USER_ROLES.OFFICER, USER_ROLES.OPERATOR, USER_ROLES.ADMIN),
  incidentController.resolveIncident
);

// 9. Cancelar incidente (CIVIL, ADMIN)
router.post(
  "/:id/cancel",
  authMiddleware,
  requireRole(USER_ROLES.CIVIL, USER_ROLES.ADMIN),
  incidentController.cancelIncident
);

// 10. Tracking en vivo
router.get(
  "/:id/tracking",
  authMiddleware,
  incidentController.getIncidentTracking
);

module.exports = router;