// Helper para respuestas exitosas
exports.success = (res, data = null, message = 'Operación exitosa', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

// Helper para respuestas de error
exports.error = (res, message = 'Error interno del servidor', statusCode = 500, details = null) => {
  const response = {
    success: false,
    error: message,
    timestamp: new Date().toISOString()
  };

  if (details) {
    response.details = details;
  }

  return res.status(statusCode).json(response);
};

// Helper para respuestas de validación
exports.validationError = (res, errors) => {
  return res.status(400).json({
    success: false,
    error: 'Error de validación',
    details: errors,
    timestamp: new Date().toISOString()
  });
};