const mongoose = require('mongoose');
const { Schema } = mongoose;

const LocationSchema = new Schema({
  // === INFORMACIÓN DEL USUARIO ===
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: [true, 'ID de usuario es requerido'],
    unique: true,
    index: true
  },
  
  // === UBICACIÓN PRINCIPAL ===
  coords: {
    type: { 
      type: String, 
      enum: ['Point'], 
      required: [true, 'Tipo de coordenadas es requerido'], 
      default: 'Point' 
    },
    coordinates: { 
      type: [Number], 
      required: [true, 'Coordenadas son requeridas'],
      validate: {
        validator: function(coords) {
          return coords.length === 2 && 
                 coords[0] >= -180 && coords[0] <= 180 &&
                 coords[1] >= -90 && coords[1] <= 90;
        },
        message: 'Coordenadas inválidas. Longitud: -180 a 180, Latitud: -90 a 90'
      }
    }
  },

  // === METADATA DE PRECISIÓN ===
  accuracyM: { 
    type: Number,
    min: [0, 'La precisión no puede ser negativa'],
    max: [1000, 'Precisión improbablemente alta']
  },
  
  headingDeg: { 
    type: Number,
    min: [0, 'El rumbo no puede ser negativo'],
    max: [360, 'El rumbo no puede exceder 360 grados']
  },
  
  speedMps: { 
    type: Number,
    min: [0, 'La velocidad no puede ser negativa'],
    max: [100, 'Velocidad improbablemente alta']
  },

  // === INFORMACIÓN DEL DISPOSITIVO ===
  deviceInfo: {
    platform: {
      type: String,
      enum: ['android', 'ios', 'web'],
      required: false
    },
    osVersion: String,
    appVersion: String,
    deviceModel: String,
    batteryLevel: {
      type: Number,
      min: 0,
      max: 100
    }
  },

  // === CONEXIÓN Y ESTADO ===
  connectionType: {
    type: String,
    enum: ['wifi', 'cellular', 'gps', 'unknown'],
    default: 'unknown'
  },
  
  signalStrength: {
    type: Number,
    min: 0,
    max: 5
  },

  // === HISTORIAL DE UBICACIÓN (ÚLTIMAS 10 POSICIONES) ===
  locationHistory: [{
    coords: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: [Number]
    },
    accuracyM: Number,
    headingDeg: Number,
    speedMps: Number,
    timestamp: {
      type: Date,
      default: Date.now
    },
    source: {
      type: String,
      enum: ['gps', 'network', 'fused', 'manual'],
      default: 'gps'
    }
  }],

  // === METADATA ===
  updatedAt: { 
    type: Date, 
    default: Date.now,
    index: true
  },
  
  createdAt: { 
    type: Date, 
    default: Date.now 
  },

  // === ESTADO OPERACIONAL ===
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  lastHeartbeat: {
    type: Date,
    default: Date.now
  },

  // === ZONAS Y ÁREAS ===
  zone: {
    type: String,
    trim: true,
    index: true
  },
  
  district: {
    type: String,
    trim: true
  },

  // === MÉTRICAS DE MOVIMIENTO ===
  totalDistance: {
    type: Number,
    default: 0,
    min: 0
  },
  
  averageSpeed: {
    type: Number,
    default: 0,
    min: 0
  },
  
  maxSpeed: {
    type: Number,
    default: 0,
    min: 0
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// === ÍNDICES AVANZADOS ===
LocationSchema.index({ coords: '2dsphere' });
LocationSchema.index({ userId: 1, updatedAt: -1 });
LocationSchema.index({ updatedAt: -1 });
LocationSchema.index({ isActive: 1, updatedAt: -1 });
LocationSchema.index({ zone: 1, district: 1 });
LocationSchema.index({ 'deviceInfo.platform': 1 });

// === VIRTUAL FIELDS ===
LocationSchema.virtual('isRecent').get(function() {
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  return this.updatedAt >= fifteenMinutesAgo;
});

LocationSchema.virtual('isAccurate').get(function() {
  return this.accuracyM && this.accuracyM <= 50;
});

LocationSchema.virtual('isMoving').get(function() {
  return this.speedMps && this.speedMps > 1;
});

LocationSchema.virtual('location').get(function() {
  return {
    longitude: this.coords.coordinates[0],
    latitude: this.coords.coordinates[1],
    accuracy: this.accuracyM,
    heading: this.headingDeg,
    speed: this.speedMps
  };
});

LocationSchema.virtual('formattedAddress').get(function() {
  return `Lat: ${this.coords.coordinates[1].toFixed(6)}, Lon: ${this.coords.coordinates[0].toFixed(6)}`;
});

// === MÉTODOS DE INSTANCIA CORREGIDOS ===
LocationSchema.methods.updateLocation = function(locationData) {
  const now = new Date();
  
  // === CORRECCIÓN CRÍTICA: GUARDAR UBICACIÓN ACTUAL EN HISTORIAL ANTES DE ACTUALIZAR ===
  if (this.coords && this.coords.coordinates) {
    // Clonar la ubicación actual antes de actualizar
    const currentLocationSnapshot = {
      coords: {
        type: this.coords.type,
        coordinates: [...this.coords.coordinates] // Clonar array
      },
      accuracyM: this.accuracyM,
      headingDeg: this.headingDeg,
      speedMps: this.speedMps,
      timestamp: this.updatedAt,
      source: 'history'
    };
    
    // Agregar al historial (mantener solo las últimas 10)
    if (this.locationHistory.length >= 10) {
      this.locationHistory.shift();
    }
    this.locationHistory.push(currentLocationSnapshot);
  }

  // Actualizar ubicación actual con nuevos datos
  this.coords = locationData.coords || this.coords;
  this.accuracyM = locationData.accuracyM !== undefined ? locationData.accuracyM : this.accuracyM;
  this.headingDeg = locationData.headingDeg !== undefined ? locationData.headingDeg : this.headingDeg;
  this.speedMps = locationData.speedMps !== undefined ? locationData.speedMps : this.speedMps;
  this.updatedAt = now;
  this.lastHeartbeat = now;

  // Actualizar información del dispositivo
  if (locationData.deviceInfo) {
    this.deviceInfo = { ...this.deviceInfo, ...locationData.deviceInfo };
  }

  // Actualizar métricas de movimiento (solo si hay movimiento significativo)
  this.updateMovementMetrics();

  // Determinar zona/distrito
  this.updateZoneInfo();

  return this.save();
};

LocationSchema.methods.updateMovementMetrics = function() {
  if (this.locationHistory.length >= 2) {
    const current = this.locationHistory[this.locationHistory.length - 1];
    const previous = this.locationHistory[this.locationHistory.length - 2];
    
    // Calcular distancia usando fórmula Haversine
    const distance = this.calculateDistance(
      previous.coords.coordinates,
      current.coords.coordinates
    );
    
    // === CORRECCIÓN: IGNORAR MOVIMIENTOS INSIGNIFICANTES (<1m) ===
    if (distance >= 1) {
      this.totalDistance += distance;
    }
    
    // Actualizar velocidades
    if (current.speedMps > this.maxSpeed) {
      this.maxSpeed = current.speedMps;
    }
    
    // Calcular velocidad promedio
    const totalSpeed = this.locationHistory.reduce((sum, loc) => sum + (loc.speedMps || 0), 0);
    this.averageSpeed = totalSpeed / this.locationHistory.length;
  }
};

LocationSchema.methods.calculateDistance = function(coord1, coord2) {
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;
  
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return distance;
};

LocationSchema.methods.updateZoneInfo = function() {
  const [lon, lat] = this.coords.coordinates;
  
  // Zonas aproximadas de Bolivia
  if (lat < -17.5) {
    this.zone = 'SUR';
  } else if (lat > -16.0) {
    this.zone = 'NORTE';
  } else {
    this.zone = 'CENTRO';
  }
  
  // Distritos aproximados
  if (Math.abs(lon + 68.1) < 0.5 && Math.abs(lat + 16.5) < 0.5) {
    this.district = 'LA_PAZ';
  } else if (Math.abs(lon + 63.1) < 0.5 && Math.abs(lat + 17.8) < 0.5) {
    this.district = 'SANTA_CRUZ';
  } else if (Math.abs(lon + 65.3) < 0.5 && Math.abs(lat + 19.0) < 0.5) {
    this.district = 'COCHABAMBA';
  } else {
    this.district = 'OTRO';
  }
};

// === NUEVO: INTEGRACIÓN CON INCIDENTES ===
LocationSchema.methods.getNearbyIncidents = async function(maxDistance = 5000) {
  const Incident = mongoose.model('Incident');
  
  return Incident.find({
    requesterLocation: {
      $near: {
        $geometry: this.coords,
        $maxDistance: maxDistance
      }
    },
    status: { $in: ['PENDING', 'OPEN', 'ASSIGNED'] }
  }).limit(10);
};

LocationSchema.methods.toMapFormat = function() {
  return {
    userId: this.userId,
    coordinates: this.coords.coordinates,
    accuracy: this.accuracyM,
    heading: this.headingDeg,
    speed: this.speedMps,
    updatedAt: this.updatedAt,
    isRecent: this.isRecent,
    isAccurate: this.isAccurate,
    isMoving: this.isMoving,
    zone: this.zone,
    district: this.district
  };
};

// === MÉTODOS ESTÁTICOS MEJORADOS ===
LocationSchema.statics.findNearby = function(coordinates, maxDistance = 5000, limit = 20) {
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  
  return this.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: coordinates
        },
        distanceField: 'distance',
        spherical: true,
        maxDistance: maxDistance,
        query: {
          updatedAt: { $gte: fifteenMinutesAgo },
          isActive: true
        }
      }
    },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "user"
      }
    },
    {
      $unwind: "$user"
    },
    {
      $match: {
        "user.role": "OFFICER",
        "user.isActive": true,
        "user.isAvailable": true
      }
    },
    {
      $project: {
        _id: 1,
        userId: 1,
        coords: 1,
        distance: 1,
        accuracyM: 1,
        updatedAt: 1,
        isRecent: 1,
        isAccurate: 1,
        isMoving: 1,
        "user._id": 1,
        "user.fullName": 1,
        "user.badgeNumber": 1,
        "user.rank": 1,
        "user.phoneNumber": 1,
        "user.unit": 1,
        "user.specialization": 1,
        "user.isAvailable": 1
      }
    },
    {
      $sort: { distance: 1 }
    },
    {
      $limit: limit
    }
  ]);
};

LocationSchema.statics.getActiveOfficers = function() {
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  
  return this.find({
    updatedAt: { $gte: fifteenMinutesAgo },
    isActive: true
  })
  .populate('userId', 'fullName badgeNumber rank unit specialization phoneNumber isAvailable')
  .sort({ updatedAt: -1 });
};

LocationSchema.statics.getZoneStats = async function() {
  return this.aggregate([
    {
      $match: {
        updatedAt: { $gte: new Date(Date.now() - 15 * 60 * 1000) },
        isActive: true
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user'
      }
    },
    {
      $unwind: '$user'
    },
    {
      $match: {
        'user.role': 'OFFICER',
        'user.isActive': true
      }
    },
    {
      $group: {
        _id: '$zone',
        officerCount: { $sum: 1 },
        availableOfficers: {
          $sum: { $cond: ['$user.isAvailable', 1, 0] }
        },
        avgAccuracy: { $avg: '$accuracyM' },
        locations: {
          $push: {
            officerId: '$user._id',
            badgeNumber: '$user.badgeNumber',
            rank: '$user.rank',
            coordinates: '$coords.coordinates',
            updatedAt: '$updatedAt',
            isAvailable: '$user.isAvailable'
          }
        }
      }
    },
    {
      $sort: { officerCount: -1 }
    }
  ]);
};

LocationSchema.statics.cleanOldLocations = async function(hours = 24) {
  const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  const result = await this.updateMany(
    {
      updatedAt: { $lt: cutoffDate },
      isActive: true
    },
    {
      $set: { isActive: false }
    }
  );
  
  return result;
};

// === NUEVO: OBTENER UBICACIÓN DE USUARIO ESPECÍFICO ===
LocationSchema.statics.getUserLocation = async function(userId) {
  return this.findOne({ userId })
    .populate('userId', 'fullName role badgeNumber rank unit phoneNumber')
    .select('-__v');
};

// === NUEVO: ACTUALIZAR UBICACIÓN CON VALIDACIÓN ===
LocationSchema.statics.updateUserLocation = async function(userId, locationData) {
  let location = await this.findOne({ userId });
  
  if (!location) {
    location = new this({ userId });
  }
  
  return location.updateLocation(locationData);
};

// === MIDDLEWARE CORREGIDO ===
LocationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  if (this.locationHistory.length > 10) {
    this.locationHistory = this.locationHistory.slice(-10);
  }
  
  next();
});

LocationSchema.post('save', function(doc) {
  console.log(`📍 Ubicación actualizada para usuario ${doc.userId} - ${doc.formattedAddress}`);
});

module.exports = mongoose.model('Location', LocationSchema);