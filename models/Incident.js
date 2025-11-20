const mongoose = require('mongoose');
const { Schema } = mongoose;

const INCIDENT_STATUS = {
  PENDING: 'PENDING',
  OPEN: 'OPEN',
  ASSIGNED: 'ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  ARRIVED: 'ARRIVED',
  RESOLVED: 'RESOLVED',
  CANCELLED: 'CANCELLED',
  REJECTED: 'REJECTED'
};

const EMERGENCY_PRIORITY = {
  LOW: 1,
  MEDIUM: 2,  
  HIGH: 3,
  CRITICAL: 4
};

const IncidentSchema = new Schema({
  // === INFORMACIÓN DEL SOLICITANTE ===
  requesterId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: [true, 'ID del solicitante es requerido'],
    index: true
  },
  
  // === NUEVO: UBICACIÓN ACTUALIZABLE DEL CIVIL ===
  requesterLocation: {
    type: { 
      type: String, 
      enum: ['Point'], 
      default: 'Point',
      required: [true, 'Tipo de ubicación es requerido']
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

  // === NUEVO: OPERADOR A CARGO ===
  handledBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },

  // === INFORMACIÓN DE LA EMERGENCIA ===
  emergencyTypeCode: { 
    type: String, 
    required: [true, 'Código de emergencia es requerido'],
    uppercase: true,
    trim: true,
    minlength: [2, 'Código muy corto'],
    maxlength: [10, 'Código muy largo']
  },
  
  emergencyType: {
    code: {
      type: String,
      uppercase: true,
      trim: true
    },
    name: {
      type: String,
      trim: true
    },
    priority: {
      type: Number,
      min: 1,
      max: 4
    },
    requiresPolice: {
      type: Boolean,
      default: true
    },
    requiresAmbulance: {
      type: Boolean,
      default: false
    },
    requiresFirefighter: {
      type: Boolean, 
      default: false
    }
  },
  
  // === DETALLES DEL INCIDENTE ===
  title: { 
    type: String,
    trim: true,
    required: [true, 'Título del incidente es requerido'],
    minlength: [5, 'Título muy corto (mínimo 5 caracteres)'],
    maxlength: [100, 'Título muy largo (máximo 100 caracteres)']
  },
  
  description: { 
    type: String,
    trim: true,
    required: [true, 'Descripción del incidente es requerida'],
    minlength: [10, 'Descripción muy corta (mínimo 10 caracteres)'],
    maxlength: [1000, 'Descripción muy larga (máximo 1000 caracteres)']
  },
  
  address: { 
    type: String,
    trim: true,
    required: [true, 'Dirección es requerida'],
    maxlength: [200, 'Dirección muy larga']
  },
  
  details: { 
    type: Schema.Types.Mixed,
    validate: {
      validator: function(details) {
        return JSON.stringify(details).length <= 5000;
      },
      message: 'Detalles adicionales muy extensos'
    }
  },

  // === FOTOS/MULTIMEDIA ===
  media: [{
    type: {
      type: String,
      enum: ['photo', 'video', 'audio'],
      required: true
    },
    url: {
      type: String,
      required: true,
      match: [/^https?:\/\/.+\..+$/, 'URL de multimedia inválida']
    },
    description: {
      type: String,
      maxlength: [200, 'Descripción de multimedia muy larga']
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  // === PRIORIDAD Y ESTADO ===
  priority: { 
    type: Number, 
    enum: {
      values: Object.values(EMERGENCY_PRIORITY),
      message: 'Prioridad inválida'
    },
    default: EMERGENCY_PRIORITY.MEDIUM,
    index: true
  },
  
  status: { 
    type: String, 
    enum: {
      values: Object.values(INCIDENT_STATUS),
      message: 'Estado inválido'
    }, 
    default: INCIDENT_STATUS.PENDING,
    index: true
  },

  // === ASIGNACIÓN DE OFICIALES ===
  assignees: [{
    officerId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User',
      required: true
    },
    officerName: {
      type: String,
      required: true,
      trim: true
    },
    officerBadge: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    officerRank: {
      type: String,
      required: true,
      trim: true
    },
    officerUnit: {
      type: String,
      required: true,
      trim: true
    },
    assignedAt: { 
      type: Date, 
      default: Date.now 
    },
    acceptedAt: { 
      type: Date 
    },
    startedTravelAt: { 
      type: Date 
    },
    arrivedAt: { 
      type: Date 
    },
    completedAt: { 
      type: Date 
    },
    status: { 
      type: String, 
      enum: ['PENDING', 'ACCEPTED', 'ON_ROUTE', 'ARRIVED', 'COMPLETED'],
      default: 'PENDING'
    },
    currentLocation: {
      type: { type: String, enum: ['Point'] },
      coordinates: [Number]
    },
    distanceToIncident: {
      type: Number,
      min: 0
    },
    estimatedArrival: Date,
    notes: {
      type: String,
      maxlength: [500, 'Notas muy extensas']
    }
  }],

  // === SEGUIMIENTO EN TIEMPO REAL ===
  timeline: [{
    action: {
      type: String,
      required: [true, 'Acción del timeline es requerida'],
      trim: true,
      maxlength: [50, 'Acción muy larga']
    },
    description: {
      type: String,
      required: [true, 'Descripción del timeline es requerida'],
      trim: true,
      maxlength: [500, 'Descripción muy larga']
    },
    performedBy: { 
      type: Schema.Types.ObjectId, 
      ref: 'User',
      required: true
    },
    location: {
      type: { type: String, enum: ['Point'] },
      coordinates: [Number]
    },
    timestamp: { 
      type: Date, 
      default: Date.now 
    },
    isPublic: {
      type: Boolean,
      default: false
    }
  }],

  // === INFORME FINAL DE RESOLUCIÓN ===
  resolution: {
    description: {
      type: String,
      required: function() { return this.status === INCIDENT_STATUS.RESOLVED; },
      minlength: [10, 'Descripción de resolución muy corta'],
      maxlength: [2000, 'Descripción de resolución muy larga']
    },
    actionsTaken: [{
      type: String,
      trim: true,
      maxlength: [200, 'Acción tomada muy larga']
    }],
    resolutionTime: {
      type: Date,
      required: function() { return this.status === INCIDENT_STATUS.RESOLVED; }
    },
    resolvedBy: { 
      type: Schema.Types.ObjectId, 
      ref: 'User',
      required: function() { return this.status === INCIDENT_STATUS.RESOLVED; }
    },
    evidence: [{
      type: { 
        type: String,
        enum: ['photo', 'video', 'document', 'audio'],
        required: true
      },
      url: {
        type: String,
        required: true,
        match: [/^https?:\/\/.+\..+$/, 'URL de evidencia inválida']
      },
      description: {
        type: String,
        maxlength: [200, 'Descripción de evidencia muy larga']
      },
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }],
    followUpRequired: {
      type: Boolean,
      default: false
    },
    followUpDate: Date
  },

  // === MÉTRICAS Y ESTADÍSTICAS ===
  responseTime: {
    type: Number,
    min: 0
  },
  
  resolutionTime: {
    type: Number,
    min: 0
  },
  
  travelDistance: {
    type: Number,
    min: 0
  },

  // === CALIFICACIÓN DEL SERVICIO ===
  rating: {
    score: { 
      type: Number, 
      min: [1, 'Calificación mínima es 1'],
      max: [5, 'Calificación máxima es 5']
    },
    comment: {
      type: String,
      maxlength: [500, 'Comentario de calificación muy largo']
    },
    ratedAt: {
      type: Date
    }
  },

  // === METADATA ===
  isActive: { 
    type: Boolean, 
    default: true 
  },
  
  requiresFollowUp: { 
    type: Boolean, 
    default: false 
  },

  // Campos para análisis
  peakHour: {
    type: Boolean,
    default: false
  },
  
  area: {
    type: String,
    trim: true
  }

}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// === ÍNDICES AVANZADOS ===
IncidentSchema.index({ requesterLocation: '2dsphere' });
IncidentSchema.index({ status: 1, priority: -1, createdAt: -1 });
IncidentSchema.index({ requesterId: 1, createdAt: -1 });
IncidentSchema.index({ emergencyTypeCode: 1, createdAt: -1 });
IncidentSchema.index({ createdAt: -1 });
IncidentSchema.index({ 'assignees.officerId': 1, status: 1 });
IncidentSchema.index({ 'assignees.status': 1 });
IncidentSchema.index({ priority: 1, status: 1 });
IncidentSchema.index({ 'timeline.timestamp': -1 });
IncidentSchema.index({ handledBy: 1, status: 1 });

// === VIRTUAL FIELDS ===
IncidentSchema.virtual('elapsedTime').get(function() {
  return Math.round((new Date() - this.createdAt) / (1000 * 60));
});

IncidentSchema.virtual('requiresImmediateAction').get(function() {
  const urgentStatuses = [INCIDENT_STATUS.PENDING, INCIDENT_STATUS.OPEN];
  const highPriority = this.priority >= EMERGENCY_PRIORITY.HIGH;
  return urgentStatuses.includes(this.status) && highPriority;
});

IncidentSchema.virtual('assignedOfficer').get(function() {
  return this.assignees.find(assignee => 
    assignee.status === 'ACCEPTED' || assignee.status === 'ON_ROUTE' || assignee.status === 'ARRIVED'
  );
});

IncidentSchema.virtual('isResolved').get(function() {
  return this.status === INCIDENT_STATUS.RESOLVED;
});

IncidentSchema.virtual('isActiveIncident').get(function() {
  const activeStatuses = [
    INCIDENT_STATUS.PENDING, 
    INCIDENT_STATUS.OPEN, 
    INCIDENT_STATUS.ASSIGNED, 
    INCIDENT_STATUS.IN_PROGRESS
  ];
  return activeStatuses.includes(this.status);
});

// === MÉTODOS DE INSTANCIA COMPLETAMENTE CORREGIDOS ===
IncidentSchema.methods.addTimelineEvent = function(action, description, performedBy, location = null, isPublic = false) {
  this.timeline.push({
    action,
    description,
    performedBy,
    location,
    isPublic,
    timestamp: new Date()
  });
  
  if (this.timeline.length > 100) {
    this.timeline = this.timeline.slice(-100);
  }
  
  return this.save();
};

// === NUEVO: ACTUALIZAR UBICACIÓN DEL CIVIL ===
IncidentSchema.methods.updateRequesterLocation = function(coordinates) {
  this.requesterLocation.coordinates = coordinates;
  this.addTimelineEvent(
    'REQUESTER_LOCATION_UPDATED',
    'Ubicación del solicitante actualizada',
    this.requesterId,
    { type: 'Point', coordinates },
    false
  );
  return this.save();
};

IncidentSchema.methods.updateOfficerLocation = function(officerId, location, distance = null) {
  const assignee = this.assignees.find(a => 
    a.officerId && a.officerId.toString() === officerId
  );
  
  if (assignee) {
    assignee.currentLocation = location;
    if (distance !== null && distance > 1) { // IGNORAR MOVIMIENTOS <1m
      assignee.distanceToIncident = Math.round(distance);
    }
    assignee.estimatedArrival = this.calculateETA(distance);
    
    if (distance && distance < 1000) {
      this.addTimelineEvent(
        'OFFICER_APPROACHING',
        `Oficial se encuentra a ${Math.round(distance)} metros del lugar`,
        officerId,
        location,
        true
      );
    }
  }
  
  return this.save();
};

IncidentSchema.methods.calculateETA = function(distance) {
  if (!distance || distance <= 0) return null;
  
  const averageSpeed = 40;
  const timeInHours = distance / 1000 / averageSpeed;
  const eta = new Date(Date.now() + timeInHours * 60 * 60 * 1000);
  
  return eta;
};

// === NUEVO: FLUJO COMPLETO DE ASIGNACIÓN ===
IncidentSchema.methods.assignOfficer = async function(officer, assignedBy = null) {
  const existingAssignment = this.assignees.find(a => 
    a.officerId.toString() === officer._id.toString()
  );
  
  if (existingAssignment) {
    throw new Error('Oficial ya está asignado a este incidente');
  }
  
  this.assignees.push({
    officerId: officer._id,
    officerName: officer.fullName,
    officerBadge: officer.badgeNumber,
    officerRank: officer.rank,
    officerUnit: officer.unit,
    assignedAt: new Date(),
    status: 'PENDING'
  });
  
  this.status = INCIDENT_STATUS.ASSIGNED;
  this.handledBy = assignedBy;
  
  await this.addTimelineEvent(
    'OFFICER_ASSIGNED',
    `Oficial ${officer.fullName} (${officer.badgeNumber}) asignado al incidente`,
    assignedBy || officer._id,
    null,
    true
  );
  
  return this.save();
};

IncidentSchema.methods.acceptAssignment = async function(officerId) {
  const assignee = this.assignees.find(a => 
    a.officerId.toString() === officerId
  );
  
  if (!assignee) {
    throw new Error('Oficial no está asignado a este incidente');
  }
  
  assignee.status = 'ACCEPTED';
  assignee.acceptedAt = new Date();
  this.status = INCIDENT_STATUS.IN_PROGRESS;
  
  await this.addTimelineEvent(
    'ASSIGNMENT_ACCEPTED',
    'Oficial aceptó la asignación y se dirige al lugar',
    officerId,
    null,
    true
  );
  
  return this.save();
};

IncidentSchema.methods.startTravel = async function(officerId) {
  const assignee = this.assignees.find(a => 
    a.officerId.toString() === officerId
  );
  
  if (!assignee || assignee.status !== 'ACCEPTED') {
    throw new Error('Oficial no ha aceptado la asignación');
  }
  
  assignee.status = 'ON_ROUTE';
  assignee.startedTravelAt = new Date();
  
  await this.addTimelineEvent(
    'OFFICER_ON_ROUTE',
    'Oficial en camino al lugar del incidente',
    officerId,
    null,
    true
  );
  
  return this.save();
};

IncidentSchema.methods.markArrived = async function(officerId) {
  const assignee = this.assignees.find(a => 
    a.officerId.toString() === officerId
  );
  
  if (!assignee || assignee.status !== 'ON_ROUTE') {
    throw new Error('Oficial no está en camino');
  }
  
  assignee.status = 'ARRIVED';
  assignee.arrivedAt = new Date();
  this.status = INCIDENT_STATUS.ARRIVED;
  
  // Calcular tiempo de respuesta
  if (this.assignees.length === 1) {
    this.responseTime = Math.round((assignee.arrivedAt - this.createdAt) / (1000 * 60));
  }
  
  await this.addTimelineEvent(
    'OFFICER_ARRIVED',
    'Oficial llegó al lugar del incidente',
    officerId,
    null,
    true
  );
  
  return this.save();
};

IncidentSchema.methods.rejectAssignment = async function(officerId, reason = '') {
  const assigneeIndex = this.assignees.findIndex(a => 
    a.officerId.toString() === officerId
  );
  
  if (assigneeIndex === -1) {
    throw new Error('Oficial no está asignado a este incidente');
  }
  
  this.assignees.splice(assigneeIndex, 1);
  
  // Si no hay más oficiales asignados, volver a estado OPEN
  if (this.assignees.length === 0) {
    this.status = INCIDENT_STATUS.OPEN;
  }
  
  await this.addTimelineEvent(
    'ASSIGNMENT_REJECTED',
    `Oficial rechazó la asignación${reason ? ': ' + reason : ''}`,
    officerId,
    null,
    false
  );
  
  return this.save();
};

IncidentSchema.methods.cancelIncident = async function(cancelledBy, reason = '') {
  this.status = INCIDENT_STATUS.CANCELLED;
  
  await this.addTimelineEvent(
    'INCIDENT_CANCELLED',
    `Incidente cancelado${reason ? ': ' + reason : ''}`,
    cancelledBy,
    null,
    true
  );
  
  return this.save();
};

IncidentSchema.methods.reopenIncident = async function(reopenedBy, reason = '') {
  this.status = INCIDENT_STATUS.OPEN;
  
  await this.addTimelineEvent(
    'INCIDENT_REOPENED',
    `Incidente reabierto${reason ? ': ' + reason : ''}`,
    reopenedBy,
    null,
    true
  );
  
  return this.save();
};

// ✅✅✅ CORREGIDO CRÍTICAMENTE: MÉTODO RESOLVE INCIDENT
IncidentSchema.methods.resolveIncident = async function(resolutionData, user) {
  // ✅ VALIDACIÓN CRÍTICA: Verificar que user existe
  if (!user || !user._id) {
    throw new Error('Usuario no válido para resolver el incidente');
  }

  // 1. Cambiar estado del incidente
  this.status = 'RESOLVED';
  this.isActive = false;

  // 2. Configurar resolución con campos automáticos
  this.resolution = {
    description: resolutionData.description,
    actionsTaken: resolutionData.actionsTaken || [],
    evidence: resolutionData.evidence || [],
    followUpRequired: resolutionData.followUpRequired || false,
    followUpDate: resolutionData.followUpDate || null,
    // ✅ CAMPOS AUTOMÁTICOS - no vienen del cliente
    resolvedBy: user._id,
    resolutionTime: new Date()
  };

  // 3. Agregar evento al timeline
  await this.addTimelineEvent(
    'INCIDENT_RESOLVED',
    `Incidente resuelto: ${resolutionData.description.substring(0, 100)}...`,
    user._id,
    null,
    true
  );

  // 4. Calcular métricas de tiempo
  if (this.createdAt) {
    this.resolutionTime = Math.round((Date.now() - this.createdAt) / (1000 * 60)); // minutos
  }

  // 5. Marcar asignaciones como completadas
  this.assignees.forEach(assignee => {
    if (assignee.status !== 'COMPLETED') {
      assignee.status = 'COMPLETED';
      assignee.completedAt = new Date();
    }
  });

  return this.save();
};

// === NUEVO: ASIGNACIÓN AUTOMÁTICA INTEGRADA ===
IncidentSchema.methods.findAndAssignNearestOfficer = async function(assignedBy = null) {
  const Location = mongoose.model('Location');
  
  // Buscar oficiales cercanos usando Location
  const nearbyOfficers = await Location.findNearby(
    this.requesterLocation.coordinates,
    5000, // 5km
    5     // top 5 más cercanos
  );
  
  if (nearbyOfficers.length === 0) {
    throw new Error('No hay oficiales disponibles en el área');
  }
  
  // Ordenar por distancia y encontrar el primero disponible
  const availableOfficer = nearbyOfficers
    .sort((a, b) => a.distance - b.distance)
    .find(officer => officer.user && officer.user.isAvailable);
  
  if (!availableOfficer) {
    throw new Error('No hay oficiales disponibles en el área');
  }
  
  // Asignar el oficial más cercano
  await this.assignOfficer(availableOfficer.user, assignedBy);
  
  return {
    officer: availableOfficer.user,
    distance: availableOfficer.distance,
    estimatedArrival: this.calculateETA(availableOfficer.distance)
  };
};

// === MÉTODOS ESTÁTICOS ===
IncidentSchema.statics.findActiveIncidents = function() {
  return this.find({
    status: { 
      $in: [
        INCIDENT_STATUS.PENDING, 
        INCIDENT_STATUS.OPEN, 
        INCIDENT_STATUS.ASSIGNED, 
        INCIDENT_STATUS.IN_PROGRESS
      ] 
    },
    isActive: true
  }).sort({ priority: -1, createdAt: 1 });
};

IncidentSchema.statics.findByOfficer = function(officerId) {
  return this.find({
    'assignees.officerId': officerId,
    isActive: true
  }).sort({ createdAt: -1 });
};

IncidentSchema.statics.getStats = async function(days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
        isActive: true
      }
    },
    {
      $facet: {
        totalIncidents: [{ $count: 'count' }],
        byStatus: [
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ],
        byPriority: [
          { $group: { _id: '$priority', count: { $sum: 1 } } }
        ],
        byType: [
          { $group: { _id: '$emergencyTypeCode', count: { $sum: 1 } } }
        ],
        responseMetrics: [
          {
            $match: {
              responseTime: { $exists: true, $ne: null }
            }
          },
          {
            $group: {
              _id: null,
              avgResponseTime: { $avg: '$responseTime' },
              minResponseTime: { $min: '$responseTime' },
              maxResponseTime: { $max: '$responseTime' }
            }
          }
        ],
        hourlyDistribution: [
          {
            $group: {
              _id: { $hour: '$createdAt' },
              count: { $sum: 1 }
            }
          },
          { $sort: { _id: 1 } }
        ]
      }
    }
  ]);
};

// === MIDDLEWARE ===
IncidentSchema.pre('save', function(next) {
  const hour = this.createdAt ? this.createdAt.getHours() : new Date().getHours();
  this.peakHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
  
  if (this.emergencyTypeCode && !this.emergencyType.code) {
    this.emergencyType = {
      code: this.emergencyTypeCode,
      name: this.emergencyTypeCode,
      priority: this.priority,
      requiresPolice: true
    };
  }
  
  next();
});

IncidentSchema.post('save', function(doc) {
  console.log(`📋 Incidente ${doc._id} guardado - Estado: ${doc.status}, Prioridad: ${doc.priority}`);
});

module.exports = mongoose.model('Incident', IncidentSchema);