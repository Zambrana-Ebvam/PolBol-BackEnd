const router = require("express").Router();
const adminController = require("../controllers/admin.controller");
const authMiddleware = require("../middlewares/authMiddleware");
const requireRole = require("../middlewares/roleMiddleware");
const { USER_ROLES } = require("../constants/emergencyTypes");

// Proteger todas las rutas de este router exclusivamente para rol ADMIN
router.use(authMiddleware, requireRole(USER_ROLES.ADMIN));

// CRUD Usuarios
router.get("/users", adminController.listUsers);
router.get("/users/:id", adminController.getUserById);
router.post("/users", adminController.createUser);
router.put("/users/:id", adminController.updateUser);
router.delete("/users/:id", adminController.deleteUser);

// CRUD Incidentes
router.put("/incidents/:id", adminController.updateIncident);
router.delete("/incidents/:id", adminController.deleteIncident);

module.exports = router;
