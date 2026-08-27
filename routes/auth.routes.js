const router = require("express").Router();
const authController = require("../controllers/auth.controller");

// Endpoints de autenticación
router.post("/register", authController.register);
router.post("/login", authController.login);

module.exports = router;
