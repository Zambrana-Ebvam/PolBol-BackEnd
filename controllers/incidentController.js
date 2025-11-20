const Incident = require('../models/Incident');
const User = require('../models/User');
const Location = require('../models/Location');
const EmergencyType = require('../models/EmergencyType');
const { success, error } = require('../utils/responseHelpers');

// GET /api/incidents - Listar incidentes con filtros avanzados
exports.getIncidents = async (req, res, next) => {
  try {
    const { 
      status, 
      emergencyTypeCode, 
      priority, 
      handledBy,
      officerId,
      page = 1, 
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      dateFrom,
      dateTo
    } = req.query;
    
    // Construir query avanzado
    let query = { isActive: true };
    
    if (status) query.status = status;
    if (emergencyTypeCode) query.emergencyTypeCode = emergencyTypeCode.toUpperCase();
    if (priority) query.priority = parseInt(priority);
    if (handledBy) query.handledBy = handledBy;
    if (officerId) query['assignees.officerId'] = officerId;

    // Filtro por fecha
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const incidents = await Incident.find(query)
      .populate('requesterId', 'fullName phoneNumber identityCard')
      .populate('assignees.officerId', 'fullName badgeNumber rank phoneNumber unit')
      .populate('timeline.performedBy', 'fullName role')
      .populate('handledBy', 'fullName badgeNumber')
      .select('-__v')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort(sort);

    const total = await Incident.countDocuments(query);

    success(res, {
      incidents,
      pagination: {
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/incidents/:id - Obtener incidente por ID completo
exports.getIncidentById = async (req, res, next) => {
  try {
    const incident = await Incident.findById(req.params.id)
      .populate('requesterId', 'fullName phoneNumber identityCard emergencyContact')
      .populate('assignees.officerId', 'fullName badgeNumber rank phoneNumber unit')
      .populate('timeline.performedBy', 'fullName role')
      .populate('handledBy', 'fullName badgeNumber phoneNumber')
      .populate('resolution.resolvedBy', 'fullName badgeNumber')
      .select('-__v');
    
    if (!incident) {
      return error(res, 'Incidente no encontrado', 404);
    }
    
    success(res, incident);
  } catch (err) {
    next(err);
  }
};

// POST /api/incidents - Crear nuevo incidente con asignación automática
exports.createIncident = async (req, res, next) => {
  try {
    const { 
      emergencyTypeCode, 
      lon, 
      lat, 
      title, 
      description, 
      address,
      details,
      priority,
      media 
    } = req.body;

    // ✅ CORRECTO: Usar req.user en lugar de requesterId del body
    const requesterId = req.user._id;

    // Validaciones
    if (lon === undefined || lat === undefined || !emergencyTypeCode) {
      return error(res, 'Código de emergencia, longitud y latitud son requeridos', 400);
    }

    // ✅ CORRECTO: Verificar que el usuario autenticado existe y está activo
    if (!req.user.isActive) {
      return error(res, 'Usuario inactivo', 403);
    }

    // Verificar tipo de emergencia
    const emergencyType = await EmergencyType.findOne({ 
      code: emergencyTypeCode.toUpperCase(),
      isActive: true 
    });
    
    if (!emergencyType) {
      return error(res, 'Tipo de emergencia no válido o inactivo', 400);
    }

    const incidentData = {
      requesterId, // ✅ Usar ID del usuario autenticado
      emergencyTypeCode: emergencyTypeCode.toUpperCase(),
      emergencyType: {
        code: emergencyType.code,
        name: emergencyType.name,
        priority: emergencyType.priority,
        requiresPolice: emergencyType.requiresPolice,
        requiresAmbulance: emergencyType.requiresAmbulance,
        requiresFirefighter: emergencyType.requiresFirefighter
      },
      requesterLocation: { 
        type: 'Point', 
        coordinates: [parseFloat(lon), parseFloat(lat)] 
      },
      title: title ? title.trim() : `Emergencia ${emergencyType.name}`,
      description: description ? description.trim() : undefined,
      address: address ? address.trim() : undefined,
      details,
      priority: priority || emergencyType.priority,
      media: media || []
    };

    const incident = await Incident.create(incidentData);
    
    // Agregar al timeline usando req.user
    await incident.addTimelineEvent(
      'INCIDENT_CREATED',
      'Incidente reportado por el usuario',
      requesterId,
      incident.requesterLocation,
      true
    );

    // Intentar asignación automática si está configurada
    let autoAssignment = null;
    if (emergencyType.autoAssign && emergencyType.requiresPolice) {
      try {
        autoAssignment = await incident.findAndAssignNearestOfficer();
      } catch (assignmentError) {
        console.log('Asignación automática fallida:', assignmentError.message);
      }
    }
    
    await incident.populate('requesterId', 'fullName phoneNumber');

    success(res, {
      incident,
      autoAssignment,
      nearbyOfficersCount: autoAssignment ? 1 : 0
    }, 'Incidente creado exitosamente', 201);
  } catch (err) {
    next(err);
  }
};

// POST /api/incidents/:id/assign - Asignar oficial a incidente
exports.assignOfficer = async (req, res, next) => {
  try {
    const incidentId = req.params.id;
    const { officerId } = req.body;

    // ✅ CORRECTO: Usar req.user en lugar de assignedBy del body
    const assignedBy = req.user._id;

    if (!officerId) {
      return error(res, 'ID de oficial es requerido', 400);
    }

    // ✅ CORRECTO: Verificar permisos del usuario autenticado
    if (!req.user.hasPermission('ASSIGN_OFFICERS')) {
      return error(res, 'No tiene permisos para asignar oficiales', 403);
    }

    const officer = await User.findOne({ 
      _id: officerId, 
      role: 'OFFICER', 
      isActive: true 
    });
    
    if (!officer) {
      return error(res, 'Oficial activo no encontrado', 404);
    }

    const incident = await Incident.findById(incidentId);
    if (!incident) {
      return error(res, 'Incidente no encontrado', 404);
    }

    await incident.assignOfficer(officer, assignedBy);
    
    const updatedIncident = await Incident.findById(incidentId)
      .populate('assignees.officerId', 'fullName badgeNumber rank unit');

    success(res, updatedIncident, 'Oficial asignado exitosamente');
  } catch (err) {
    next(err);
  }
};

// POST /api/incidents/:id/auto-assign - Asignación automática
exports.autoAssignOfficer = async (req, res, next) => {
  try {
    const incidentId = req.params.id;
    
    // ✅ CORRECTO: Usar req.user en lugar de assignedBy del body
    const assignedBy = req.user._id;

    const incident = await Incident.findById(incidentId);
    if (!incident) {
      return error(res, 'Incidente no encontrado', 404);
    }

    // ✅ CORRECTO: Verificar permisos del usuario autenticado
    if (!req.user.hasPermission('ASSIGN_OFFICERS')) {
      return error(res, 'No tiene permisos para asignar oficiales', 403);
    }

    // Verificar que el incidente requiere policía
    if (!incident.emergencyType.requiresPolice) {
      return error(res, 'Este tipo de emergencia no requiere asignación de oficiales', 400);
    }

    const assignment = await incident.findAndAssignNearestOfficer(assignedBy);
    
    const updatedIncident = await Incident.findById(incidentId)
      .populate('assignees.officerId', 'fullName badgeNumber rank unit');

    success(res, {
      incident: updatedIncident,
      assignment
    }, 'Oficial asignado automáticamente');
  } catch (err) {
    next(err);
  }
};

// POST /api/incidents/:id/accept - Aceptar asignación
exports.acceptAssignment = async (req, res, next) => {
  try {
    const incidentId = req.params.id;
    
    // ✅ CORRECTO: Usar req.user en lugar de officerId del body
    const officerId = req.user._id;

    const incident = await Incident.findById(incidentId);
    if (!incident) {
      return error(res, 'Incidente no encontrado', 404);
    }

    // ✅ CORRECTO: Verificar que el usuario es un oficial
    if (req.user.role !== 'OFFICER') {
      return error(res, 'Solo oficiales pueden aceptar asignaciones', 403);
    }

    await incident.acceptAssignment(officerId);
    
    const updatedIncident = await Incident.findById(incidentId)
      .populate('assignees.officerId', 'fullName badgeNumber rank unit');

    success(res, updatedIncident, 'Asignación aceptada exitosamente');
  } catch (err) {
    next(err);
  }
};

// POST /api/incidents/:id/start-travel - Oficial en camino
exports.startTravel = async (req, res, next) => {
  try {
    const incidentId = req.params.id;
    
    // ✅ CORRECTO: Usar req.user en lugar de officerId del body
    const officerId = req.user._id;

    const incident = await Incident.findById(incidentId);
    if (!incident) {
      return error(res, 'Incidente no encontrado', 404);
    }

    // ✅ CORRECTO: Verificar que el usuario es un oficial
    if (req.user.role !== 'OFFICER') {
      return error(res, 'Solo oficiales pueden marcar en camino', 403);
    }

    await incident.startTravel(officerId);
    
    const updatedIncident = await Incident.findById(incidentId)
      .populate('assignees.officerId', 'fullName badgeNumber rank unit');

    success(res, updatedIncident, 'Oficial en camino al incidente');
  } catch (err) {
    next(err);
  }
};

// POST /api/incidents/:id/mark-arrived - Oficial llegó al lugar
exports.markArrived = async (req, res, next) => {
  try {
    const incidentId = req.params.id;
    
    // ✅ CORRECTO: Usar req.user en lugar de officerId del body
    const officerId = req.user._id;

    const incident = await Incident.findById(incidentId);
    if (!incident) {
      return error(res, 'Incidente no encontrado', 404);
    }

    // ✅ CORRECTO: Verificar que el usuario es un oficial
    if (req.user.role !== 'OFFICER') {
      return error(res, 'Solo oficiales pueden marcar llegada', 403);
    }

    await incident.markArrived(officerId);
    
    const updatedIncident = await Incident.findById(incidentId)
      .populate('assignees.officerId', 'fullName badgeNumber rank unit');

    success(res, updatedIncident, 'Oficial llegó al lugar del incidente');
  } catch (err) {
    next(err);
  }
};

// ✅✅✅ CORREGIDO CRÍTICAMENTE: PATCH /api/incidents/:id/resolve
exports.resolveIncident = async (req, res, next) => {
  try {
    const incidentId = req.params.id;
    const { 
      description, 
      actionsTaken, 
      evidence, 
      followUpRequired, 
      followUpDate 
    } = req.body;

    // Validaciones básicas
    if (!description) {
      return error(res, 'Descripción de la resolución es requerida', 400);
    }

    const incident = await Incident.findById(incidentId);
    if (!incident) {
      return error(res, 'Incidente no encontrado', 404);
    }

    // ✅ VERIFICACIÓN MEJORADA DE PERMISOS
    const userRole = req.user.role;
    const userId = req.user._id.toString();
    
    // Verificar si el usuario es el oficial asignado
    const isAssignedOfficer = incident.assignees.some(
      assignee => assignee.officerId && assignee.officerId.toString() === userId
    );

    // Permisos: ADMIN, OPERATOR o oficial asignado
    if (!['ADMIN', 'OPERATOR'].includes(userRole) && !isAssignedOfficer) {
      return error(res, 'No tiene permisos para resolver este incidente', 403);
    }

    // Preparar datos de resolución
    const resolutionData = {
      description: description.trim(),
      actionsTaken: actionsTaken || [],
      evidence: evidence || [],
      followUpRequired: followUpRequired || false,
      followUpDate: followUpDate || null
    };

    // ✅✅✅ CORRECCIÓN CRÍTICA: Usar req.user en lugar de resolvedBy del body
    await incident.resolveIncident(resolutionData, req.user);

    // Obtener incidente actualizado
    const updatedIncident = await Incident.findById(incidentId)
      .populate('assignees.officerId', 'fullName badgeNumber rank unit')
      .populate('resolution.resolvedBy', 'fullName badgeNumber role')
      .populate('requesterId', 'fullName phoneNumber');

    success(res, updatedIncident, 'Incidente resuelto exitosamente');

  } catch (err) {
    next(err);
  }
};

// PUT /api/incidents/:id/location - Actualizar ubicación del solicitante
exports.updateRequesterLocation = async (req, res, next) => {
  try {
    const incidentId = req.params.id;
    const { lon, lat } = req.body;

    if (lon === undefined || lat === undefined) {
      return error(res, 'Longitud y latitud son requeridas', 400);
    }

    const incident = await Incident.findById(incidentId);
    if (!incident) {
      return error(res, 'Incidente no encontrado', 404);
    }

    await incident.updateRequesterLocation([parseFloat(lon), parseFloat(lat)]);
    
    const updatedIncident = await Incident.findById(incidentId);

    success(res, updatedIncident, 'Ubicación del solicitante actualizada');
  } catch (err) {
    next(err);
  }
};

// GET /api/incidents/:id/nearby-officers - Buscar oficiales cercanos
exports.getNearbyOfficers = async (req, res, next) => {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) {
      return error(res, 'Incidente no encontrado', 404);
    }
    
    const nearbyOfficers = await Location.findNearby(
      incident.requesterLocation.coordinates,
      5000, // 5km
      10    // límite
    );
    
    success(res, {
      incidentId: incident._id,
      incidentLocation: incident.requesterLocation,
      nearbyOfficers,
      total: nearbyOfficers.length
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/incidents/stats/summary - Estadísticas avanzadas
exports.getIncidentStats = async (req, res, next) => {
  try {
    const { days = 30, emergencyTypeCode, zone } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    let matchQuery = {
      createdAt: { $gte: startDate },
      isActive: true
    };

    if (emergencyTypeCode) {
      matchQuery.emergencyTypeCode = emergencyTypeCode.toUpperCase();
    }

    const stats = await Incident.aggregate([
      {
        $match: matchQuery
      },
      {
        $facet: {
          totalIncidents: [{ $count: "count" }],
          byStatus: [
            { $group: { _id: "$status", count: { $sum: 1 } } }
          ],
          byType: [
            { $group: { _id: "$emergencyTypeCode", count: { $sum: 1 } } }
          ],
          byPriority: [
            { $group: { _id: "$priority", count: { $sum: 1 } } }
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
                avgResponseTime: { $avg: "$responseTime" },
                minResponseTime: { $min: "$responseTime" },
                maxResponseTime: { $max: "$responseTime" }
              }
            }
          ],
          resolutionMetrics: [
            {
              $match: {
                resolutionTime: { $exists: true, $ne: null }
              }
            },
            {
              $group: {
                _id: null,
                avgResolutionTime: { $avg: "$resolutionTime" },
                minResolutionTime: { $min: "$resolutionTime" },
                maxResolutionTime: { $max: "$resolutionTime" }
              }
            }
          ],
          hourlyDistribution: [
            {
              $group: {
                _id: { $hour: "$createdAt" },
                count: { $sum: 1 }
              }
            },
            { $sort: { _id: 1 } }
          ],
          dailyTrend: [
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: "%Y-%m-%d",
                    date: "$createdAt"
                  }
                },
                count: { $sum: 1 }
              }
            },
            { $sort: { _id: 1 } },
            { $limit: 30 }
          ]
        }
      }
    ]);

    const result = stats[0];
    
    success(res, {
      period: `${days} días`,
      total: result.totalIncidents[0]?.count || 0,
      byStatus: result.byStatus,
      byType: result.byType,
      byPriority: result.byPriority,
      avgResponseTime: Math.round(result.responseMetrics[0]?.avg || 0),
      avgResolutionTime: Math.round(result.resolutionMetrics[0]?.avg || 0),
      hourlyDistribution: result.hourlyDistribution,
      dailyTrend: result.dailyTrend
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/incidents/:id/rating - Calificar incidente
exports.rateIncident = async (req, res, next) => {
  try {
    const incidentId = req.params.id;
    const { rating, comment } = req.body;

    // ✅ CORRECTO: Usar req.user en lugar de ratedBy del body
    const ratedBy = req.user._id;

    if (!rating || rating < 1 || rating > 5) {
      return error(res, 'La calificación debe ser entre 1 y 5', 400);
    }

    const incident = await Incident.findById(incidentId);
    if (!incident) {
      return error(res, 'Incidente no encontrado', 404);
    }

    if (incident.status !== 'RESOLVED') {
      return error(res, 'Solo se pueden calificar incidentes resueltos', 400);
    }

    // ✅ CORRECTO: Verificar que el usuario es el solicitante del incidente
    if (incident.requesterId.toString() !== req.user._id.toString()) {
      return error(res, 'Solo el solicitante puede calificar este incidente', 403);
    }

    incident.rating = {
      score: parseInt(rating),
      comment: comment ? comment.trim() : undefined,
      ratedAt: new Date(),
      ratedBy: ratedBy // ✅ Guardar quién calificó
    };

    await incident.save();
    
    success(res, incident, 'Incidente calificado exitosamente');
  } catch (err) {
    next(err);
  }
};