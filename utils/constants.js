// Roles del sistema
exports.USER_ROLES = {
  CIVIL: 'CIVIL',
  OFFICER: 'OFFICER', 
  OPERATOR: 'OPERATOR',
  ADMIN: 'ADMIN'
};

// Permisos disponibles
exports.PERMISSIONS = {
  VIEW_INCIDENTS: 'VIEW_INCIDENTS',
  MANAGE_INCIDENTS: 'MANAGE_INCIDENTS', 
  ASSIGN_OFFICERS: 'ASSIGN_OFFICERS',
  MANAGE_USERS: 'MANAGE_USERS',
  VIEW_REPORTS: 'VIEW_REPORTS',
  MANAGE_EMERGENCY_TYPES: 'MANAGE_EMERGENCY_TYPES',
  ACCESS_MAP: 'ACCESS_MAP',
  MANAGE_SYSTEM: 'MANAGE_SYSTEM'
};

// Configuración de permisos por rol
exports.ROLE_PERMISSIONS = {
  CIVIL: [
    'VIEW_INCIDENTS' // Solo puede ver sus propios incidentes
  ],
  OFFICER: [
    'VIEW_INCIDENTS',
    'ACCESS_MAP'
  ],
  OPERATOR: [
    'VIEW_INCIDENTS',
    'MANAGE_INCIDENTS',
    'ASSIGN_OFFICERS',
    'VIEW_REPORTS',
    'MANAGE_EMERGENCY_TYPES',
    'ACCESS_MAP'
  ],
  ADMIN: [
    'VIEW_INCIDENTS',
    'MANAGE_INCIDENTS',
    'ASSIGN_OFFICERS',
    'MANAGE_USERS',
    'VIEW_REPORTS',
    'MANAGE_EMERGENCY_TYPES',
    'ACCESS_MAP',
    'MANAGE_SYSTEM'
  ]
};

// Configuración de acceso por endpoint
exports.ENDPOINT_ACCESS = {
  // Users
  'GET /api/users': ['ADMIN', 'OPERATOR'],
  'GET /api/users/:id': ['ADMIN', 'OPERATOR', 'OWNER'], // OWNER = usuario dueño del recurso
  'POST /api/users': ['ADMIN'],
  'PUT /api/users/:id': ['ADMIN', 'OPERATOR', 'OWNER'],
  'DELETE /api/users/:id': ['ADMIN'],
  
  // Incidents
  'GET /api/incidents': ['ADMIN', 'OPERATOR', 'OFFICER', 'CIVIL'], // Filtrado por ownership
  'POST /api/incidents': ['CIVIL', 'ADMIN', 'OPERATOR'],
  'PUT /api/incidents/:id/assign': ['ADMIN', 'OPERATOR'],
  'POST /api/incidents/:id/resolve': ['ADMIN', 'OPERATOR', 'ASSIGNED_OFFICER'],
  
  // Emergency Types
  'GET /api/emergency-types': ['PUBLIC'],
  'POST /api/emergency-types': ['ADMIN', 'OPERATOR'],
  'PUT /api/emergency-types/:code': ['ADMIN', 'OPERATOR'],
  'DELETE /api/emergency-types/:code': ['ADMIN']
};