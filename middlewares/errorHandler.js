module.exports = function errorHandler(err, req, res, next) {
  console.error("❌ Error capturado en el middleware global:", err);

  // Error de clave duplicada en MongoDB (code 11000)
  if (err.code === 11000) {
    const fields = Object.keys(err.keyValue || {});
    const fieldName = fields.length > 0 ? fields[0] : "campo";
    let message = `El valor ingresado para '${fieldName}' ya se encuentra registrado en el sistema.`;
    
    if (fieldName === "email") message = "El correo electrónico ya está registrado.";
    if (fieldName === "ci") message = "El número de carnet de identidad (CI) ya está registrado.";
    if (fieldName === "escalafon") message = "El código de escalafón policial ya está registrado.";

    return res.status(409).json({
      error: message,
      field: fieldName,
    });
  }

  // Error de validación de Mongoose
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      error: "Error de validación de datos",
      details: errors,
    });
  }

  // Error de ID inválido de MongoDB (CastError)
  if (err.name === "CastError" && err.kind === "ObjectId") {
    return res.status(400).json({
      error: "El identificador (ID) proporcionado tiene un formato inválido.",
    });
  }

  // Error de JSON mal formado en el body
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      error: "El cuerpo de la solicitud (JSON) tiene un formato inválido.",
    });
  }

  // Errores JWT
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ error: "Token inválido." });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({ error: "Token expirado." });
  }

  const statusCode = res.statusCode !== 200 && res.statusCode !== 201 ? res.statusCode : (err.statusCode || 500);
  res.status(statusCode).json({
    error: err.message || "Error interno del servidor",
  });
};
