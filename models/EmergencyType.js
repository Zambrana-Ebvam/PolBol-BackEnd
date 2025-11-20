const mongoose = require('mongoose');
const { Schema } = mongoose;

const EmergencyTypeSchema = new Schema({
  // === IDENTIFICACIÓN ===
  code: { 
    type: String, 
    required: [true, 'Código de emergencia es requerido'],
    unique: true, // === CORRECCIÓN: ÍNDICE ÚNICO DE MONGODB ===
    uppercase: true,
    trim: true,
    minlength: [2, 'Código muy corto (mínimo 2 caracteres)'],
    maxlength: [10, 'Código muy largo (máximo 10 caracteres)'],
    match: [/^[A-Z0-9_]+$/, 'Código solo puede contener letras mayúsculas, números y guiones bajos'],
    index: true
  },
  
  name: { 
    type: String, 
    required: [true, 'Nombre de emergencia es requerido'],
    trim: true,
    minlength: [3, 'Nombre muy corto (mínimo 3 caracteres)'],
    maxlength: [50, 'Nombre muy largo (máximo 50 caracteres)'],
    index: true
  },
  
  // === DESCRIPCIÓN ===
  description: { 
    type: String,
    required: [true, 'Descripción es requerida'],
    trim: true,
    minlength: [10, 'Descripción muy corta (mínimo 10 caracteres)'],
    maxlength: [500, 'Descripción muy larga (máximo 500 caracteres)']
  },
  
  detailedInstructions: {
    type: String,
    trim: true,
    maxlength: [2000, 'Instrucciones muy extensas']
  },

  // === CONFIGURACIÓN DE PRIORIDAD ===
  priority: { 
    type: Number, 
    required: [true, 'Prioridad es requerida'],
    min: [1, 'Prioridad mínima es 1'],
    max: [4, 'Prioridad máxima es 4'],
    validate: {
      validator: Number.isInteger,
      message: 'La prioridad debe ser un número entero'
    },
    index: true
  },
  
  responseTime: { 
    type: Number,
    required: [true, 'Tiempo de respuesta objetivo es requerido'],
    min: [1, 'Tiempo de respuesta mínimo es 1 minuto'],
    max: [60, 'Tiempo de respuesta máximo es 60 minutos'],
    validate: {
      validator: Number.isInteger,
      message: 'El tiempo de respuesta debe ser un número entero'
    }
  },

  // === RECURSOS REQUERIDOS ===
  requiresPolice: {
    type: Boolean,
    default: true,
    required: true
  },
  
  requiresAmbulance: {
    type: Boolean,
    default: false,
    required: true
  },
  
  requiresFirefighter: {
    type: Boolean,
    default: false,
    required: true
  },
  
  requiresSpecialUnit: {
    type: Boolean,
    default: false
  },
  
  requiredSpecializations: [{
    type: String,
    enum: ['PATRULLAJE', 'TRANSITO', 'ANTIDROGAS', 'SEGURIDAD_CIUDADANA', 'INTELIGENCIA', 'RESCATE', 'BOMBEROS', 'AMBULANCIA'],
    trim: true
  }],

  // === CONFIGURACIÓN VISUAL ===
  color: { 
    type: String, 
    required: [true, 'Color es requerido'],
    default: '#FF0000',
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Color debe ser un código hexadecimal válido']
  },
  
  icon: {
    type: String,
    trim: true,
    default: '⚠️'
  },

  // === METADATA OPERACIONAL ===
  isActive: { 
    type: Boolean, 
    default: true,
    required: true,
    index: true
  },
  
  autoAssign: {
    type: Boolean,
    default: false
  },
  
  minOfficers: {
    type: Number,
    default: 1,
    min: 1,
    max: 10
  },
  
  maxOfficers: {
    type: Number,
    default: 3,
    min: 1,
    max: 20
  },

  // === ESTADÍSTICAS Y MÉTRICAS ===
  usageCount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  averageResolutionTime: {
    type: Number,
    default: 0,
    min: 0
  },
  
  successRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },

  // === CATEGORIZACIÓN ===
  category: {
    type: String,
    required: [true, 'Categoría es requerida'],
    enum: [
      'DELITO',
      'ACCIDENTE',
      'SALUD',
      'INCENDIO',
      'DESASTRE_NATURAL',
      'DISTURBIO',
      'SEGURIDAD_CIUDADANA',
      'OTRO'
    ],
    index: true
  },
  
  subcategory: {
    type: String,
    trim: true,
    maxlength: [50, 'Subcategoría muy larga']
  },

  // === CONFIGURACIÓN DE NOTIFICACIONES ===
  notificationTemplate: {
    title: {
      type: String,
      trim: true,
      maxlength: [100, 'Título de notificación muy largo']
    },
    message: {
      type: String,
      trim: true,
      maxlength: [500, 'Mensaje de notificación muy largo']
    },
    sound: {
      type: String,
      default: 'default'
    },
    vibration: {
      type: Boolean,
      default: true
    }
  },

  // === HISTORIAL DE MODIFICACIONES ===
  version: {
    type: Number,
    default: 1
  },
  
  changeLog: [{
    version: Number,
    changes: [String],
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    reason: {
      type: String,
      maxlength: [200, 'Razón de cambio muy larga']
    }
  }],

  // === METADATA ===
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creador es requerido']
  },
  
  lastModifiedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }

}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// === ÍNDICES COMPUESTOS ===
EmergencyTypeSchema.index({ category: 1, priority: -1 });
EmergencyTypeSchema.index({ isActive: 1, priority: -1 });
EmergencyTypeSchema.index({ requiresPolice: 1, requiresAmbulance: 1, requiresFirefighter: 1 });
EmergencyTypeSchema.index({ createdAt: -1 });

// === VIRTUAL FIELDS ===
EmergencyTypeSchema.virtual('urgencyLevel').get(function() {
  const levels = {
    1: 'BAJA',
    2: 'MEDIA', 
    3: 'ALTA',
    4: 'CRÍTICA'
  };
  return levels[this.priority] || 'DESCONOCIDA';
});

EmergencyTypeSchema.virtual('requiredResources').get(function() {
  const resources = [];
  if (this.requiresPolice) resources.push('POLICÍA');
  if (this.requiresAmbulance) resources.push('AMBULANCIA');
  if (this.requiresFirefighter) resources.push('BOMBEROS');
  if (this.requiresSpecialUnit) resources.push('UNIDAD_ESPECIAL');
  return resources;
});

EmergencyTypeSchema.virtual('isHighPriority').get(function() {
  return this.priority >= 3;
});

EmergencyTypeSchema.virtual('responseTimeFormatted').get(function() {
  if (this.responseTime < 60) {
    return `${this.responseTime} min`;
  } else {
    const hours = Math.floor(this.responseTime / 60);
    const minutes = this.responseTime % 60;
    return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
  }
});

// === MÉTODOS DE INSTANCIA ===
EmergencyTypeSchema.methods.getPublicInfo = function() {
  return {
    code: this.code,
    name: this.name,
    description: this.description,
    priority: this.priority,
    urgencyLevel: this.urgencyLevel,
    responseTime: this.responseTime,
    responseTimeFormatted: this.responseTimeFormatted,
    color: this.color,
    icon: this.icon,
    category: this.category,
    requiredResources: this.requiredResources,
    isHighPriority: this.isHighPriority,
    requiresPolice: this.requiresPolice,
    requiresAmbulance: this.requiresAmbulance,
    requiresFirefighter: this.requiresFirefighter
  };
};

EmergencyTypeSchema.methods.getOperationalInfo = function() {
  return {
    code: this.code,
    name: this.name,
    priority: this.priority,
    responseTime: this.responseTime,
    requiresPolice: this.requiresPolice,
    requiresAmbulance: this.requiresAmbulance,
    requiresFirefighter: this.requiresFirefighter,
    requiredSpecializations: this.requiredSpecializations,
    minOfficers: this.minOfficers,
    maxOfficers: this.maxOfficers,
    autoAssign: this.autoAssign,
    notificationTemplate: this.notificationTemplate
  };
};

EmergencyTypeSchema.methods.recordUsage = function(resolutionTime = null) {
  this.usageCount += 1;
  
  if (resolutionTime) {
    const totalTime = this.averageResolutionTime * (this.usageCount - 1) + resolutionTime;
    this.averageResolutionTime = totalTime / this.usageCount;
  }
  
  return this.save();
};

EmergencyTypeSchema.methods.updateSuccessRate = function(successful = true) {
  const successCount = Math.floor(this.usageCount * (this.successRate / 100));
  const newSuccessCount = successful ? successCount + 1 : successCount;
  this.successRate = (newSuccessCount / this.usageCount) * 100;
  
  return this.save();
};

EmergencyTypeSchema.methods.createNewVersion = function(changes, changedBy, reason = '') {
  this.version += 1;
  
  this.changeLog.push({
    version: this.version,
    changes: Array.isArray(changes) ? changes : [changes],
    changedBy: changedBy,
    changedAt: new Date(),
    reason: reason
  });
  
  if (this.changeLog.length > 10) {
    this.changeLog = this.changeLog.slice(-10);
  }
  
  this.lastModifiedBy = changedBy;
  
  return this.save();
};

EmergencyTypeSchema.methods.deactivate = function(deactivatedBy, reason = '') {
  this.isActive = false;
  this.lastModifiedBy = deactivatedBy;
  
  this.changeLog.push({
    version: this.version + 1,
    changes: ['Tipo de emergencia desactivado'],
    changedBy: deactivatedBy,
    changedAt: new Date(),
    reason: reason
  });
  
  return this.save();
};

EmergencyTypeSchema.methods.activate = function(activatedBy, reason = '') {
  this.isActive = true;
  this.lastModifiedBy = activatedBy;
  
  this.changeLog.push({
    version: this.version + 1,
    changes: ['Tipo de emergencia reactivado'],
    changedBy: activatedBy,
    changedAt: new Date(),
    reason: reason
  });
  
  return this.save();
};

// === MÉTODOS ESTÁTICOS ===
EmergencyTypeSchema.statics.getActiveTypes = function() {
  return this.find({ isActive: true })
    .select('code name description priority responseTime color icon category requiresPolice requiresAmbulance requiresFirefighter')
    .sort({ priority: -1, name: 1 });
};

EmergencyTypeSchema.statics.findByCategory = function(category) {
  return this.find({
    category: category,
    isActive: true
  }).sort({ priority: -1, name: 1 });
};

EmergencyTypeSchema.statics.findByPriority = function(priority) {
  return this.find({
    priority: priority,
    isActive: true
  }).sort({ name: 1 });
};

EmergencyTypeSchema.statics.getUsageStats = async function(days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const Incident = mongoose.model('Incident');
  
  return Incident.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
        isActive: true
      }
    },
    {
      $group: {
        _id: '$emergencyTypeCode',
        count: { $sum: 1 },
        avgResolutionTime: { $avg: '$resolutionTime' },
        resolvedCount: {
          $sum: { $cond: [{ $eq: ['$status', 'RESOLVED'] }, 1, 0] }
        }
      }
    },
    {
      $lookup: {
        from: 'emergencytypes',
        localField: '_id',
        foreignField: 'code',
        as: 'typeInfo'
      }
    },
    {
      $unwind: '$typeInfo'
    },
    {
      $project: {
        code: '$_id',
        count: 1,
        avgResolutionTime: 1,
        successRate: {
          $multiply: [
            { $divide: ['$resolvedCount', '$count'] },
            100
          ]
        },
        name: '$typeInfo.name',
        priority: '$typeInfo.priority',
        category: '$typeInfo.category'
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

EmergencyTypeSchema.statics.getResourceStats = async function() {
  return this.aggregate([
    {
      $match: { isActive: true }
    },
    {
      $group: {
        _id: null,
        totalTypes: { $sum: 1 },
        policeRequired: {
          $sum: { $cond: ['$requiresPolice', 1, 0] }
        },
        ambulanceRequired: {
          $sum: { $cond: ['$requiresAmbulance', 1, 0] }
        },
        firefighterRequired: {
          $sum: { $cond: ['$requiresFirefighter', 1, 0] }
        },
        highPriority: {
          $sum: { $cond: [{ $gte: ['$priority', 3] }, 1, 0] }
        },
        autoAssignEnabled: {
          $sum: { $cond: ['$autoAssign', 1, 0] }
        }
      }
    }
  ]);
};

// === MIDDLEWARE CORREGIDO ===
EmergencyTypeSchema.pre('save', function(next) {
  // Asegurar que el código esté en mayúsculas
  if (this.code) {
    this.code = this.code.toUpperCase().trim();
  }
  
  // Validar coherencia en la configuración de recursos
  if (!this.requiresPolice && !this.requiresAmbulance && !this.requiresFirefighter) {
    return next(new Error('Al menos un tipo de recurso debe ser requerido'));
  }
  
  // Validar que minOfficers no sea mayor que maxOfficers
  if (this.minOfficers > this.maxOfficers) {
    return next(new Error('minOfficers no puede ser mayor que maxOfficers'));
  }
  
  next();
});

EmergencyTypeSchema.post('save', function(doc) {
  console.log(`🚨 Tipo de emergencia ${doc.code} (${doc.name}) - Prioridad: ${doc.priority}, Activo: ${doc.isActive}`);
});

// === CORRECCIÓN: ELIMINAR VALIDACIÓN MANUAL - USAR MANEJO DE ERRORES E11000 ===
// Se elimina la validación personalizada y se confía en el índice único de MongoDB
// El error E11000 se manejará en los controllers

module.exports = mongoose.model('EmergencyType', EmergencyTypeSchema);