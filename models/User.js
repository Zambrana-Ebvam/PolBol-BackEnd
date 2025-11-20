const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { Schema } = mongoose;

// Rangos policiales específicos de Bolivia
const POLICE_RANKS = {
  GACIP_VOLUNTARIO: 'GACIP - Voluntario',
  ALUMNO: 'ALUMNO',
  SARGENTO: 'SARGENTO',
  SARGENTO_SEGUNDO: 'SARGENTO_SEGUNDO',
  SARGENTO_PRIMERO: 'SARGENTO_PRIMERO', 
  SARGENTO_MAYOR: 'SARGENTO_MAYOR',
  SUBOFICIAL_SEGUNDO: 'SUBOFICIAL_SEGUNDO',
  SUBOFICIAL_PRIMERO: 'SUBOFICIAL_PRIMERO',
  SUBOFICIAL_MAYOR: 'SUBOFICIAL_MAYOR',
  SUBOFICIAL_SUPERIOR: 'SUBOFICIAL_SUPERIOR',
  CADETE: 'CADETE',
  SUBTENIENTE: 'SUBTENIENTE',
  TENIENTE: 'TENIENTE',
  CAPITAN: 'CAPITAN',
  MAYOR: 'MAYOR',
  TENIENTE_CORONEL: 'TENIENTE_CORONEL',
  CORONEL: 'CORONEL',
  GENERAL_PRIMERO: 'GENERAL_PRIMERO',
  GENERAL_MAYOR: 'GENERAL_MAYOR', 
  GENERAL_SUPERIOR: 'GENERAL_SUPERIOR'
};

const USER_ROLES = {
  CIVIL: 'CIVIL',
  OFFICER: 'OFFICER', 
  OPERATOR: 'OPERATOR',
  ADMIN: 'ADMIN'
};

const UserSchema = new Schema({
  // === INFORMACIÓN BÁSICA ===
  email: { 
    type: String, 
    required: false, 
    unique: true, 
    sparse: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email inválido']
  },
  
  role: { 
    type: String, 
    enum: Object.values(USER_ROLES), 
    required: [true, 'El rol es requerido'],
    index: true
  },
  
  fullName: { 
    type: String, 
    required: [true, 'El nombre completo es requerido'],
    trim: true,
    minlength: [2, 'El nombre debe tener al menos 2 caracteres'],
    maxlength: [100, 'El nombre no puede exceder 100 caracteres']
  },
  
  phoneNumber: { 
    type: String, 
    required: [true, 'El número de teléfono es requerido'],
    trim: true,
    match: [/^\+591[6-7]\d{7}$/, 'Formato inválido. Use: +59161234567']
  },

  // === NUEVO: AUTENTICACIÓN ===
  password: {
    type: String,
    required: function() { 
      return this.role !== USER_ROLES.CIVIL; 
    },
    minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
    select: false // No incluir en queries por defecto
  },

  // === NUEVO: TOKEN DE REFRESH ===
  refreshToken: {
    type: String,
    select: false
  },

  // === INFORMACIÓN PARA CIVILES ===
  identityCard: { 
    type: String, 
    required: function() { return this.role === USER_ROLES.CIVIL; },
    trim: true,
    match: [/^\d{7,10}$/, 'Carnet de identidad inválido']
  },
  
  dateOfBirth: { 
    type: Date,
    required: function() { return this.role === USER_ROLES.CIVIL; },
    validate: {
      validator: function(dob) {
        return dob <= new Date() && dob >= new Date('1900-01-01');
      },
      message: 'Fecha de nacimiento inválida'
    }
  },
  
  emergencyContact: {
    name: { 
      type: String, 
      trim: true,
      required: function() { return this.role === USER_ROLES.CIVIL; }
    },
    phoneNumber: { 
      type: String, 
      trim: true,
      required: function() { return this.role === USER_ROLES.CIVIL; },
      match: [/^\+591[6-7]\d{7}$/, 'Formato inválido para contacto de emergencia']
    },
    relationship: { 
      type: String, 
      trim: true,
      required: function() { return this.role === USER_ROLES.CIVIL; }
    }
  },

  // === INFORMACIÓN PARA OFICIALES Y OPERADORES ===
  badgeNumber: { 
    type: String, 
    required: function() { 
      return this.role === USER_ROLES.OFFICER || this.role === USER_ROLES.OPERATOR; 
    },
    trim: true,
    uppercase: true,
    match: [/^[A-Z0-9]{3,10}$/, 'Número de placa inválido']
  },
  
  rank: { 
    type: String, 
    required: function() { return this.role === USER_ROLES.OFFICER; },
    enum: {
      values: Object.values(POLICE_RANKS),
      message: 'Rango policial inválido'
    }
  },
  
  unit: { 
    type: String,
    trim: true,
    required: function() { return this.role === USER_ROLES.OFFICER; },
    maxlength: [100, 'La unidad no puede exceder 100 caracteres']
  },
  
  specialization: { 
    type: [{
      type: String,
      enum: ['PATRULLAJE', 'TRANSITO', 'ANTIDROGAS', 'SEGURIDAD_CIUDADANA', 'INTELIGENCIA', 'RESCATE', 'BOMBEROS', 'AMBULANCIA'],
      trim: true
    }],
    default: [],
    validate: {
      validator: function(specs) {
        return specs.length <= 5;
      },
      message: 'Máximo 5 especializaciones permitidas'
    }
  },
  
  isAvailable: {
    type: Boolean,
    default: true,
    required: function() { return this.role === USER_ROLES.OFFICER; }
  },

  // === INFORMACIÓN GENERAL ===
  avatarUrl: { 
    type: String,
    trim: true,
    match: [/^https?:\/\/.+\..+$/, 'URL de avatar inválida']
  },
  
  isActive: { 
    type: Boolean, 
    default: true,
    index: true
  },
  
  lastLocationUpdate: { 
    type: Date 
  },
  
  deviceToken: { 
    type: String,
    sparse: true
  },

  // === METADATA ===
  profileCompleted: {
    type: Boolean,
    default: false
  },

  lastLogin: {
    type: Date
  },

  loginCount: {
    type: Number,
    default: 0
  },

  // === PERMISOS DINÁMICOS ===
  permissions: [{
    type: String,
    enum: [
      'VIEW_INCIDENTS',
      'MANAGE_INCIDENTS', 
      'ASSIGN_OFFICERS',
      'MANAGE_USERS',
      'VIEW_REPORTS',
      'MANAGE_EMERGENCY_TYPES',
      'ACCESS_MAP',
      'MANAGE_SYSTEM'
    ]
  }]

}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// === ÍNDICES MEJORADOS ===
UserSchema.index({ phoneNumber: 1 }, { unique: true });
UserSchema.index({ badgeNumber: 1 }, { sparse: true, unique: true });
UserSchema.index({ identityCard: 1 }, { sparse: true, unique: true });
UserSchema.index({ role: 1, isActive: 1 });
UserSchema.index({ rank: 1, isAvailable: 1 });
UserSchema.index({ specialization: 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ 'emergencyContact.phoneNumber': 1 }, { sparse: true });
UserSchema.index({ email: 1 }, { sparse: true });

// === VIRTUAL FIELDS ===
UserSchema.virtual('displayName').get(function() {
  if (this.role === USER_ROLES.OFFICER && this.rank) {
    return `${this.rank} ${this.fullName}`;
  }
  return this.fullName;
});

UserSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

UserSchema.virtual('isHighCommand').get(function() {
  const highRanks = [
    POLICE_RANKS.MAYOR,
    POLICE_RANKS.TENIENTE_CORONEL, 
    POLICE_RANKS.CORONEL,
    POLICE_RANKS.GENERAL_PRIMERO,
    POLICE_RANKS.GENERAL_MAYOR,
    POLICE_RANKS.GENERAL_SUPERIOR
  ];
  return this.role === USER_ROLES.OFFICER && highRanks.includes(this.rank);
});

UserSchema.virtual('isOperational').get(function() {
  return this.role === USER_ROLES.OFFICER && this.isAvailable && this.isActive;
});

// === MÉTODOS DE INSTANCIA MEJORADOS ===
UserSchema.methods.getPublicProfile = function() {
  const profile = {
    _id: this._id,
    displayName: this.displayName,
    role: this.role,
    phoneNumber: this.phoneNumber,
    isActive: this.isActive,
    profileCompleted: this.profileCompleted,
    createdAt: this.createdAt
  };

  if (this.role === USER_ROLES.CIVIL) {
    profile.identityCard = this.identityCard;
    profile.emergencyContact = this.emergencyContact;
    profile.age = this.age;
  }

  if (this.role === USER_ROLES.OFFICER || this.role === USER_ROLES.OPERATOR) {
    profile.badgeNumber = this.badgeNumber;
    profile.rank = this.rank;
    profile.unit = this.unit;
    profile.specialization = this.specialization;
    profile.isAvailable = this.isAvailable;
    profile.isHighCommand = this.isHighCommand;
    profile.isOperational = this.isOperational;
  }

  if (this.avatarUrl) {
    profile.avatarUrl = this.avatarUrl;
  }

  if (this.email) {
    profile.email = this.email;
  }

  return profile;
};

UserSchema.methods.getOfficerMapProfile = function() {
  if (this.role !== USER_ROLES.OFFICER) return null;
  
  return {
    _id: this._id,
    badgeNumber: this.badgeNumber,
    displayName: this.displayName,
    rank: this.rank,
    unit: this.unit,
    specialization: this.specialization,
    isAvailable: this.isAvailable,
    phoneNumber: this.phoneNumber,
    isHighCommand: this.isHighCommand,
    lastLocationUpdate: this.lastLocationUpdate
  };
};

UserSchema.methods.markAsAvailable = function() {
  this.isAvailable = true;
  this.lastLocationUpdate = new Date();
  return this.save();
};

UserSchema.methods.markAsUnavailable = function() {
  this.isAvailable = false;
  return this.save();
};

UserSchema.methods.recordLogin = function() {
  this.lastLogin = new Date();
  this.loginCount += 1;
  return this.save();
};

UserSchema.methods.hasPermission = function(permission) {
  // Los ADMIN tienen todos los permisos
  if (this.role === USER_ROLES.ADMIN) return true;
  
  // Verificar permisos específicos
  return this.permissions && this.permissions.includes(permission);
};

// === NUEVO: MÉTODOS DE AUTENTICACIÓN ===
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.generateAuthToken = function() {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { 
      userId: this._id, 
      role: this.role,
      badgeNumber: this.badgeNumber 
    },
    process.env.JWT_SECRET || 'fallback_secret_emergency_system',
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

UserSchema.methods.generateRefreshToken = function() {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { userId: this._id },
    process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret',
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
};

// === NUEVO: MÉTODO PARA LOGIN ===
UserSchema.statics.findByCredentials = async function(identifier, password) {
  let user = await this.findOne({
    $or: [
      { email: identifier },
      { phoneNumber: identifier },
      { badgeNumber: identifier }
    ]
  }).select('+password +refreshToken'); // Incluir password y refreshToken

  if (!user) {
    throw new Error('Credenciales inválidas');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new Error('Credenciales inválidas');
  }

  return user;
};

// === MÉTODOS ESTÁTICOS ===
UserSchema.statics.findAvailableOfficers = function() {
  return this.find({
    role: USER_ROLES.OFFICER,
    isAvailable: true,
    isActive: true
  }).select('badgeNumber rank fullName unit specialization phoneNumber');
};

UserSchema.statics.findBySpecialization = function(specialization) {
  return this.find({
    role: USER_ROLES.OFFICER,
    specialization: specialization,
    isAvailable: true,
    isActive: true
  });
};

UserSchema.statics.getOfficerStats = async function() {
  return this.aggregate([
    {
      $match: {
        role: USER_ROLES.OFFICER,
        isActive: true
      }
    },
    {
      $group: {
        _id: '$rank',
        count: { $sum: 1 },
        available: {
          $sum: { $cond: ['$isAvailable', 1, 0] }
        }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

// === MIDDLEWARE CORREGIDO ===
UserSchema.pre('save', async function(next) {
  // RECALCULAR profileCompleted EN CADA GUARDADO
  const requiredFields = ['fullName', 'phoneNumber'];
  const hasRequiredFields = requiredFields.every(field => this[field]);
  
  if (this.role === USER_ROLES.CIVIL) {
    const civilFields = ['identityCard', 'dateOfBirth', 'emergencyContact.name', 'emergencyContact.phoneNumber'];
    const hasCivilFields = civilFields.every(field => {
      if (field.startsWith('emergencyContact.')) {
        const nestedField = field.split('.')[1];
        return this.emergencyContact && this.emergencyContact[nestedField];
      }
      return this[field];
    });
    this.profileCompleted = hasRequiredFields && hasCivilFields;
  } else if (this.role === USER_ROLES.OFFICER) {
    const officerFields = ['badgeNumber', 'rank', 'unit'];
    const hasOfficerFields = officerFields.every(field => this[field]);
    this.profileCompleted = hasRequiredFields && hasOfficerFields;
  } else {
    this.profileCompleted = hasRequiredFields;
  }

  // === NUEVO: MIDDLEWARE PARA HASH DE PASSWORD ===
  // Solo hashear si el password fue modificado
  if (this.isModified('password')) {
    try {
      // Generar salt y hashear password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      const salt = await bcrypt.genSalt(saltRounds);
      this.password = await bcrypt.hash(this.password, salt);
    } catch (error) {
      return next(error);
    }
  }
  
  next();
});

// Validación mejorada para rangos y roles
UserSchema.path('rank').validate(function(rank) {
  if (this.role !== USER_ROLES.OFFICER) return true;
  return Object.values(POLICE_RANKS).includes(rank);
}, 'Rango inválido para el rol de oficial');

module.exports = mongoose.model('User', UserSchema);