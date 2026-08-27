const router = require("express").Router();
const locationController = require("../controllers/location.controller");
const authMiddleware = require("../middlewares/authMiddleware");

// Actualizar mi propia ubicación (cualquier usuario autenticado)
router.put("/me", authMiddleware, locationController.updateMyLocation);

// Búsqueda de oficiales cercanos por radio
router.get("/nearby", locationController.getNearbyOfficers);

module.exports = router;
