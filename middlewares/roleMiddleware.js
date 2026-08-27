module.exports = function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const userRole = req.user?.role;

    if (!userRole) {
      return res.status(401).json({
        error: "Acceso no autorizado: No se encontró el rol de usuario",
      });
    }

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: "Acceso denegado: No tienes permisos suficientes para realizar esta acción",
        rolesPermitidos: allowedRoles,
        rolActual: userRole,
      });
    }

    next();
  };
};
