const router = require("express").Router();

const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const incidentRoutes = require("./incident.routes");
const locationRoutes = require("./location.routes");
const adminRoutes = require("./admin.routes");
const commonRoutes = require("./common.routes");
const authController = require("../controllers/auth.controller");
const locationController = require("../controllers/location.controller");

// Montaje de rutas con compatibilidad hacia atrás
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/incidents", incidentRoutes);
router.use("/locations", locationRoutes);
router.use("/admin", adminRoutes);
router.use("/", commonRoutes);

// Endpoints directos de compatibilidad exacta con la versión anterior
router.get("/officers", authController.getOfficers);
router.get("/operators", authController.getOperators);
router.get("/civilians", authController.getCivilians);
router.get("/nearby", locationController.getNearbyOfficers);

module.exports = router;
