const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: "No token (Bearer) provided" });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(payload.id).select("-passwordHash");
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    req.user = user; // 👈 aquí vive el rol
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid token" });
  }
};
