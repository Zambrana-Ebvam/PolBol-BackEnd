const router = require("express").Router();
const authController = require("../controllers/auth.controller");
const authMiddleware = require("../middlewares/authMiddleware");

// Perfil de usuario autenticado
router.get("/me", authMiddleware, authController.getMe);
router.put("/me", authMiddleware, authController.updateMe);
router.delete("/me", authMiddleware, authController.deleteMe);

module.exports = router;
