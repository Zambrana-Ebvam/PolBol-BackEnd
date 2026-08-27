const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({
        error: "Acceso no autorizado: Token no proporcionado",
      });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error("❌ JWT_SECRET no configurada en .env");
      return res.status(500).json({ error: "Error de configuración en el servidor" });
    }

    const payload = jwt.verify(token, jwtSecret);

    const user = await User.findById(payload.id).select("-passwordHash");
    if (!user) {
      return res.status(401).json({
        error: "Acceso denegado: El usuario ya no existe o fue eliminado",
      });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Sesión expirada. Inicie sesión nuevamente." });
    }
    return res.status(401).json({ error: "Token inválido o corrupto" });
  }
};
