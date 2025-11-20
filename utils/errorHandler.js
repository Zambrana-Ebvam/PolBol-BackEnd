const { error } = require('../utils/responseHelpers');

// Middleware global de manejo de errores
const errorHandler = (err, req, res, next) => {
  console.error('Error capturado:', err);

  // Error de validación de Mongoose
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(error => ({
      field: error.path,
      message: error.message
    }));
    return error(res, 'Error de validación', 400, errors);
  }

  // Error de duplicado de Mongoose
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    const fieldName = {
      phoneNumber: 'número de teléfono',
      badgeNumber: 'número de escalafón',
      identityCard: 'carnet de identidad',
      email: 'email',
      code: 'código'
    }[field] || field;
    
    return error(res, `El ${fieldName} ya está registrado`, 400);
  }

  // Error de CastError (ID inválido)
  if (err.name === 'CastError') {
    return error(res, 'ID inválido', 400);
  }

  // Error personalizado con status code
  if (err.statusCode) {
    return error(res, err.message, err.statusCode);
  }

  // Error genérico
  error(res, 'Error interno del servidor', 500);
};

module.exports = errorHandler;