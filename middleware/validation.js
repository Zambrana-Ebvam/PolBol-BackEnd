const { validationError } = require('../utils/responseHelpers');

// Sanitizar y validar datos de entrada
exports.sanitizeInput = (req, res, next) => {
  // Sanitizar strings: trim y escape básico
  const sanitizeString = (str) => {
    if (typeof str === 'string') {
      return str.trim().replace(/[<>]/g, '');
    }
    return str;
  };

  // Sanitizar body
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeString(req.body[key]);
      }
    });
  }

  // Sanitizar query params
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = sanitizeString(req.query[key]);
      }
    });
  }

  next();
};

// Validar coordenadas
exports.validateCoordinates = (req, res, next) => {
  const { lon, lat } = req.body;
  
  if (lon === undefined || lat === undefined) {
    return validationError(res, ['Longitud y latitud son requeridas']);
  }

  const lonNum = parseFloat(lon);
  const latNum = parseFloat(lat);

  if (isNaN(lonNum) || isNaN(latNum)) {
    return validationError(res, ['Longitud y latitud deben ser números válidos']);
  }

  if (lonNum < -180 || lonNum > 180 || latNum < -90 || latNum > 90) {
    return validationError(res, ['Coordenadas fuera de rango válido']);
  }

  // Asignar valores validados
  req.body.lon = lonNum;
  req.body.lat = latNum;

  next();
};

// Validar ID de MongoDB
exports.validateObjectId = (req, res, next) => {
  const { id } = req.params;
  
  if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
    return validationError(res, ['ID inválido']);
  }

  next();
};