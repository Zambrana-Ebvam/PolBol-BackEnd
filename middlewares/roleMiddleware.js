module.exports = function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const role = req.user?.role;

    if (!role) {
      return res.status(401).json({ error: "No role in token" });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        error: "Forbidden: insufficient role",
        allowed: allowedRoles,
        provided: role
      });
    }

    next();
  };
};
