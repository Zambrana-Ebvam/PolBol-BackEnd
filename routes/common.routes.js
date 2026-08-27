const router = require("express").Router();
const { EMERGENCY_TYPES, POLICE_RANKS } = require("../constants/emergencyTypes");

// Listado de tipos de emergencias
router.get("/emergency-types", (req, res) => {
  res.json(EMERGENCY_TYPES);
});

// Listado de rangos policiales de Bolivia
router.get("/police-ranks", (req, res) => {
  res.json(POLICE_RANKS);
});

module.exports = router;
