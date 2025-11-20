const User = require('../models/User');
const { success, error } = require('../utils/responseHelpers');
const jwt = require('jsonwebtoken');

// POST /api/auth/login - Iniciar sesión
exports.login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body;

    // Validaciones
    if (!identifier || !password) {
      return error(res, 'Identificador y contraseña son requeridos', 400);
    }

    // Buscar usuario y validar credenciales
    const user = await User.findByCredentials(identifier, password);
    
    if (!user.isActive) {
      return error(res, 'Usuario desactivado', 403);
    }

    // Generar tokens
    const token = user.generateAuthToken();
    const refreshToken = user.generateRefreshToken();

    // Guardar refresh token en la base de datos
    user.refreshToken = refreshToken;
    await user.save();

    // Registrar login
    await user.recordLogin();

    success(res, {
      user: user.getPublicProfile(),
      token,
      refreshToken,
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    }, 'Login exitoso');
  } catch (err) {
    // No exponer detalles específicos del error por seguridad
    if (err.message === 'Credenciales inválidas') {
      return error(res, 'Credenciales inválidas', 401);
    }
    next(err);
  }
};

// POST /api/auth/refresh - Refrescar token
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return error(res, 'Refresh token requerido', 400);
    }

    try {
      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret'
      );

      const user = await User.findOne({ 
        _id: decoded.userId,
        refreshToken: refreshToken,
        isActive: true 
      });

      if (!user) {
        return error(res, 'Refresh token inválido', 401);
      }

      // Generar nuevo token de acceso
      const newToken = user.generateAuthToken();

      success(res, {
        token: newToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      }, 'Token refrescado exitosamente');
    } catch (jwtError) {
      return error(res, 'Refresh token inválido o expirado', 401);
    }
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/logout - Cerrar sesión
exports.logout = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (user) {
      user.refreshToken = null;
      await user.save();
    }

    success(res, null, 'Logout exitoso');
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me - Obtener perfil del usuario autenticado
exports.getProfile = async (req, res, next) => {
  try {
    success(res, req.user.getPublicProfile());
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/change-password - Cambiar contraseña
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return error(res, 'Contraseña actual y nueva contraseña son requeridas', 400);
    }

    if (newPassword.length < 6) {
      return error(res, 'La nueva contraseña debe tener al menos 6 caracteres', 400);
    }

    // Obtener usuario con password
    const user = await User.findById(req.user._id).select('+password');
    
    // Verificar contraseña actual
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return error(res, 'Contraseña actual incorrecta', 400);
    }

    // Actualizar contraseña
    user.password = newPassword;
    await user.save();

    success(res, null, 'Contraseña actualizada exitosamente');
  } catch (err) {
    next(err);
  }
};