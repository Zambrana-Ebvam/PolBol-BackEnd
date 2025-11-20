require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Importar rutas
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const incidentRoutes = require('./routes/incidents');
const locationRoutes = require('./routes/locations');
const emergencyTypeRoutes = require('./routes/emergencyTypes');

// Importar middleware
const errorHandler = require('./utils/errorHandler');
const { apiLimiter } = require('./middleware/rateLimit');
const { authenticate } = require('./middleware/auth');

const app = express();

// === CONFIGURACIÓN JWT ===
if (!process.env.JWT_SECRET) {
  console.warn('⚠️  JWT_SECRET no está definido. Usando secreto por defecto (NO seguro para producción)');
}

// Middleware global
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(apiLimiter);

// === RUTAS PÚBLICAS ===
app.use('/api/auth', authRoutes);
app.use('/api/emergency-types', emergencyTypeRoutes);

// Health check público
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '2.0.0'
  });
});
// === Información básica de la API ===
app.get('/api/info', (req, res) => {
  res.json({
    name: process.env.APP_NAME || 'Police Emergency System',
    version: '2.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    mongoConnected: mongoose.connection.readyState === 1,
    environment: process.env.NODE_ENV || 'development'
  });
});

// === Documentación temporal ===
app.get('/api/docs', (req, res) => {
  res.json({
    message: "📚 API documentation coming soon",
    endpoints: [
      "/api/auth/login",
      "/api/auth/me",
      "/api/users",
      "/api/incidents",
      "/api/locations",
      "/api/emergency-types"
    ]
  });
});


// === RUTAS PROTEGIDAS ===
app.use('/api/users', authenticate, userRoutes);
app.use('/api/incidents', authenticate, incidentRoutes);
app.use('/api/locations', authenticate, locationRoutes);

// === 404 HANDLER (válido para Express 4.x/5.x) ===
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Ruta no encontrada: ${req.originalUrl}`,
    timestamp: new Date().toISOString()
  });
});

// MIDDLEWARE GLOBAL DE ERRORES
app.use(errorHandler);

// === CONEXIÓN A MONGODB ===
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/police_emergency_system')
  .then(() => console.log('✅ Conectado a MongoDB'))
  .catch(err => console.error('❌ Error conectando a MongoDB:', err));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
  console.log(`🔐 Sistema de autenticación JWT activado`);
  console.log(`📊 Health check ➤ http://localhost:${PORT}/health`);
});
