require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const apiRouter = require("./routes");
const errorHandler = require("./middlewares/errorHandler");

const app = express();
const PORT = process.env.PORT || 3000;

// Conectar Base de Datos
connectDB();

// Middlewares Globales
app.use(cors());
app.use(express.json());

// Health Check / Ruta de bienvenida
app.get("/", (req, res) => {
  res.json({
    status: "online",
    message: "🚨 PolBol - API de Gestión y Despacho Policial operativa ✅",
    version: "1.0.0",
    timestamp: new Date(),
  });
});

// Registrar Enrutador Principal
app.use(apiRouter);

// Manejo de rutas no encontradas (404)
app.use((req, res) => {
  res.status(404).json({
    error: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
  });
});

// Middleware Global de Manejo de Errores
app.use(errorHandler);

// Iniciar Servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor PolBol ejecutándose en el puerto ${PORT}`);
  console.log(`📡 URL base: http://localhost:${PORT}`);
});

module.exports = app;