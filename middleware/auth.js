const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { error } = require('../utils/responseHelpers');

// Middleware de autenticación JWT real
exports.authenticate = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return error(res, 'Token de acceso requerido', 401);
    }

    const token = authHeader.replace('Bearer ', '');
    
    try {
      const decoded = jwt.verify(
        token, 
        process.env.JWT_SECRET || 'fallback_secret_emergency_system'
      );
      
      // Buscar usuario y verificar que existe y está activo
      const user = await User.findById(decoded.userId)
        .select('-__v -refreshToken');
      
      if (!user || !user.isActive) {
        return error(res, 'Usuario no encontrado o inactivo', 401);
      }

      // Adjuntar usuario a la request
      req.user = user;
      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return error(res, 'Token expirado', 401);
      }
      return error(res, 'Token inválido', 401);
    }
  } catch (err) {
    next(err);
  }
};

// Middleware de autorización por roles
exports.authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return error(res, 'No autenticado', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return error(res, 
        `No autorizado. Roles permitidos: ${allowedRoles.join(', ')}`, 
        403
      );
    }

    next();
  };
};

// Middleware para verificar permisos específicos
exports.requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return error(res, 'No autenticado', 401);
    }

    // ADMIN tiene todos los permisos
    if (req.user.role === 'ADMIN') {
      return next();
    }

    // Verificar permisos específicos del usuario
    if (!req.user.permissions || !req.user.permissions.includes(permission)) {
      return error(res, `Permiso requerido: ${permission}`, 403);
    }

    next();
  };
};

// Middleware para verificar que el usuario es dueño del recurso o tiene permisos
exports.requireOwnershipOrPermission = (resourceField = 'userId', permission = null) => {
  return (req, res, next) => {
    if (!req.user) {
      return error(res, 'No autenticado', 401);
    }

    // ADMIN puede hacer cualquier cosa
    if (req.user.role === 'ADMIN') {
      return next();
    }

    // Si tiene el permiso específico, permitir
    if (permission && req.user.permissions && req.user.permissions.includes(permission)) {
      return next();
    }

    // Verificar ownership
    const resourceId = req.params[resourceField] || req.body[resourceField];
    
    if (!resourceId) {
      return error(res, 'ID de recurso no especificado', 400);
    }

    if (resourceId.toString() !== req.user._id.toString()) {
      return error(res, 'No autorizado para modificar este recurso', 403);
    }

    next();
  };
};


// Middleware para verificar que el usuario es el oficial asignado
exports.requireAssignedOfficer = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'OFFICER') {
      return error(res, 'Solo oficiales pueden realizar esta acción', 403);
    }

    const Incident = require('../models/Incident');
    const incident = await Incident.findById(req.params.id);
    
    if (!incident) {
      return error(res, 'Incidente no encontrado', 404);
    }

    const isAssigned = incident.assignees.some(assignee => 
      assignee.officerId && assignee.officerId.toString() === req.user._id.toString()
    );

    if (!isAssigned) {
      return error(res, 'No está asignado a este incidente', 403);
    }

    next();
  } catch (err) {
    next(err);
  }
};

// Middleware para verificar que el usuario es el solicitante del incidente
exports.requireIncidentRequester = async (req, res, next) => {
  try {
    const Incident = require('../models/Incident');
    const incident = await Incident.findById(req.params.id);
    
    if (!incident) {
      return error(res, 'Incidente no encontrado', 404);
    }

    // ADMIN y OPERATOR pueden realizar cualquier acción
    if (req.user.role === 'ADMIN' || req.user.role === 'OPERATOR') {
      return next();
    }

    // Verificar que el usuario es el solicitante
    if (incident.requesterId.toString() !== req.user._id.toString()) {
      return error(res, 'No es el solicitante de este incidente', 403);
    }

    next();
  } catch (err) {
    next(err);
  }
};

// Middleware para verificar que el usuario puede ver el incidente (filtrado por rol)
exports.canViewIncident = async (req, res, next) => {
  try {
    if (!req.user) {
      return error(res, 'No autenticado', 401);
    }

    // ADMIN y OPERATOR pueden ver todos los incidentes
    if (req.user.role === 'ADMIN' || req.user.role === 'OPERATOR') {
      return next();
    }

    const Incident = require('../models/Incident');
    const incident = await Incident.findById(req.params.id);
    
    if (!incident) {
      return error(res, 'Incidente no encontrado', 404);
    }

    // OFFICER: solo puede ver incidentes asignados
    if (req.user.role === 'OFFICER') {
      const isAssigned = incident.assignees.some(assignee => 
        assignee.officerId && assignee.officerId.toString() === req.user._id.toString()
      );
      
      if (!isAssigned) {
        return error(res, 'No autorizado para ver este incidente', 403);
      }
    }

    // CIVIL: solo puede ver sus propios incidentes
    if (req.user.role === 'CIVIL') {
      if (incident.requesterId.toString() !== req.user._id.toString()) {
        return error(res, 'No autorizado para ver este incidente', 403);
      }
    }

    next();
  } catch (err) {
    next(err);
  }
};