const EmergencyType = require('../models/EmergencyType');
const Incident = require('../models/Incident');
const User = require('../models/User');
const { success, error } = require('../utils/responseHelpers');

// GET /api/emergency-types - Listar todos los tipos de emergencia (PÚBLICO)
exports.getEmergencyTypes = async (req, res, next) => {
  try {
    const { isActive, category, priority, requiresPolice } = req.query;
    
    let query = {};
    
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (category) query.category = category;
    if (priority) query.priority = parseInt(priority);
    if (requiresPolice !== undefined) query.requiresPolice = requiresPolice === 'true';

    const emergencyTypes = await EmergencyType.find(query)
      .populate('createdBy', 'fullName')
      .populate('lastModifiedBy', 'fullName')
      .select('-__v')
      .sort({ priority: -1, name: 1 });

    success(res, {
      count: emergencyTypes.length,
      emergencyTypes: emergencyTypes.map(et => et.getPublicInfo())
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/emergency-types/:code - Obtener tipo de emergencia por código (PÚBLICO)
exports.getEmergencyTypeByCode = async (req, res, next) => {
  try {
    const emergencyType = await EmergencyType.findOne({ 
      code: req.params.code.toUpperCase() 
    })
    .populate('createdBy', 'fullName')
    .populate('lastModifiedBy', 'fullName')
    .select('-__v');
    
    if (!emergencyType) {
      return error(res, 'Tipo de emergencia no encontrado', 404);
    }
    
    success(res, {
      ...emergencyType.getPublicInfo(),
      operationalInfo: emergencyType.getOperationalInfo(),
      version: emergencyType.version,
      changeLog: emergencyType.changeLog,
      createdBy: emergencyType.createdBy,
      lastModifiedBy: emergencyType.lastModifiedBy
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/emergency-types - Crear nuevo tipo de emergencia (SOLO ADMIN/OPERATOR)
exports.createEmergencyType = async (req, res, next) => {
  try {
    const { 
      code, 
      name, 
      description, 
      priority, 
      responseTime, 
      color,
      icon,
      category,
      subcategory,
      requiresPolice,
      requiresAmbulance,
      requiresFirefighter,
      requiresSpecialUnit,
      requiredSpecializations,
      minOfficers,
      maxOfficers,
      autoAssign,
      notificationTemplate,
      isActive = true
    } = req.body;

    // Validaciones
    if (!code || !name || !description || !category) {
      return error(res, 'Código, nombre, descripción y categoría son requeridos', 400);
    }

    // CORRECCIÓN: Usar req.user en lugar de createdBy del body
    const createdBy = req.user._id;

    const emergencyTypeData = {
      code: code.toUpperCase().trim(),
      name: name.trim(),
      description: description.trim(),
      priority: priority || 2,
      responseTime: responseTime || 15,
      color: color || '#FF0000',
      icon: icon || '⚠️',
      category,
      subcategory: subcategory || '',
      requiresPolice: requiresPolice !== undefined ? requiresPolice : true,
      requiresAmbulance: requiresAmbulance || false,
      requiresFirefighter: requiresFirefighter || false,
      requiresSpecialUnit: requiresSpecialUnit || false,
      requiredSpecializations: requiredSpecializations || [],
      minOfficers: minOfficers || 1,
      maxOfficers: maxOfficers || 3,
      autoAssign: autoAssign || false,
      notificationTemplate: notificationTemplate || {
        title: `Emergencia: ${name}`,
        message: 'Se ha reportado una emergencia en su área',
        sound: 'default',
        vibration: true
      },
      isActive,
      createdBy // Usar el ID del usuario autenticado
    };

    const emergencyType = await EmergencyType.create(emergencyTypeData);
    
    await emergencyType.populate('createdBy', 'fullName');

    success(res, emergencyType.getPublicInfo(), 'Tipo de emergencia creado exitosamente', 201);
  } catch (err) {
    next(err);
  }
};

// PUT /api/emergency-types/:code - Actualizar tipo de emergencia (SOLO ADMIN/OPERATOR)
exports.updateEmergencyType = async (req, res, next) => {
  try {
    const { 
      name, 
      description, 
      priority, 
      responseTime, 
      color,
      icon,
      category,
      subcategory,
      requiresPolice,
      requiresAmbulance,
      requiresFirefighter,
      requiresSpecialUnit,
      requiredSpecializations,
      minOfficers,
      maxOfficers,
      autoAssign,
      notificationTemplate,
      isActive,
      changeReason 
    } = req.body;

    // CORRECCIÓN: Usar req.user en lugar de lastModifiedBy del body
    const lastModifiedBy = req.user._id;

    const emergencyType = await EmergencyType.findOne({ 
      code: req.params.code.toUpperCase() 
    });

    if (!emergencyType) {
      return error(res, 'Tipo de emergencia no encontrado', 404);
    }

    // Preparar cambios para el historial
    const changes = [];
    const updateData = {};

    if (name !== undefined && name !== emergencyType.name) {
      updateData.name = name.trim();
      changes.push(`Nombre cambiado de "${emergencyType.name}" a "${name}"`);
    }

    if (description !== undefined && description !== emergencyType.description) {
      updateData.description = description.trim();
      changes.push('Descripción actualizada');
    }

    if (priority !== undefined && priority !== emergencyType.priority) {
      updateData.priority = priority;
      changes.push(`Prioridad cambiada de ${emergencyType.priority} a ${priority}`);
    }

    if (responseTime !== undefined && responseTime !== emergencyType.responseTime) {
      updateData.responseTime = responseTime;
      changes.push(`Tiempo de respuesta cambiado de ${emergencyType.responseTime} a ${responseTime} minutos`);
    }

    if (color !== undefined) updateData.color = color;
    if (icon !== undefined) updateData.icon = icon;
    if (category !== undefined) updateData.category = category;
    if (subcategory !== undefined) updateData.subcategory = subcategory;
    if (requiresPolice !== undefined) updateData.requiresPolice = requiresPolice;
    if (requiresAmbulance !== undefined) updateData.requiresAmbulance = requiresAmbulance;
    if (requiresFirefighter !== undefined) updateData.requiresFirefighter = requiresFirefighter;
    if (requiresSpecialUnit !== undefined) updateData.requiresSpecialUnit = requiresSpecialUnit;
    if (requiredSpecializations !== undefined) updateData.requiredSpecializations = requiredSpecializations;
    if (minOfficers !== undefined) updateData.minOfficers = minOfficers;
    if (maxOfficers !== undefined) updateData.maxOfficers = maxOfficers;
    if (autoAssign !== undefined) updateData.autoAssign = autoAssign;
    if (notificationTemplate !== undefined) updateData.notificationTemplate = notificationTemplate;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    // CORRECCIÓN: Siempre actualizar lastModifiedBy con el usuario autenticado
    updateData.lastModifiedBy = lastModifiedBy;

    // Si hay cambios, crear nueva versión
    if (changes.length > 0) {
      await emergencyType.createNewVersion(changes, lastModifiedBy, changeReason || 'Actualización desde API');
    }

    const updatedEmergencyType = await EmergencyType.findOneAndUpdate(
      { code: req.params.code.toUpperCase() },
      { $set: updateData },
      { new: true, runValidators: true }
    )
    .populate('createdBy', 'fullName')
    .populate('lastModifiedBy', 'fullName')
    .select('-__v');

    const message = changes.length > 0 ? 'Tipo de emergencia actualizado exitosamente' : 'Sin cambios realizados';
    
    success(res, {
      ...updatedEmergencyType.getPublicInfo(),
      operationalInfo: updatedEmergencyType.getOperationalInfo(),
      changes: changes.length > 0 ? changes : ['Sin cambios']
    }, message);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/emergency-types/:code - Desactivar tipo de emergencia (SOLO ADMIN)
exports.deactivateEmergencyType = async (req, res, next) => {
  try {
    const { reason } = req.body;

    // CORRECCIÓN: Usar req.user en lugar de deactivatedBy del body
    const deactivatedBy = req.user._id;

    const emergencyType = await EmergencyType.findOne({ 
      code: req.params.code.toUpperCase() 
    });

    if (!emergencyType) {
      return error(res, 'Tipo de emergencia no encontrado', 404);
    }

    await emergencyType.deactivate(deactivatedBy, reason || 'Desactivado desde API');

    const updatedEmergencyType = await EmergencyType.findOne({ 
      code: req.params.code.toUpperCase() 
    })
    .populate('lastModifiedBy', 'fullName')
    .select('-__v');

    success(res, updatedEmergencyType.getPublicInfo(), 'Tipo de emergencia desactivado exitosamente');
  } catch (err) {
    next(err);
  }
};

// PATCH /api/emergency-types/:code/activate - Reactivar tipo de emergencia (SOLO ADMIN)
exports.activateEmergencyType = async (req, res, next) => {
  try {
    const { reason } = req.body;

    // CORRECCIÓN: Usar req.user en lugar de activatedBy del body
    const activatedBy = req.user._id;

    const emergencyType = await EmergencyType.findOne({ 
      code: req.params.code.toUpperCase() 
    });

    if (!emergencyType) {
      return error(res, 'Tipo de emergencia no encontrado', 404);
    }

    await emergencyType.activate(activatedBy, reason || 'Reactivado desde API');

    const updatedEmergencyType = await EmergencyType.findOne({ 
      code: req.params.code.toUpperCase() 
    })
    .populate('lastModifiedBy', 'fullName')
    .select('-__v');

    success(res, updatedEmergencyType.getPublicInfo(), 'Tipo de emergencia reactivado exitosamente');
  } catch (err) {
    next(err);
  }
};

// GET /api/emergency-types/stats/usage - Estadísticas de uso de tipos de emergencia (SOLO ADMIN/OPERATOR)
exports.getEmergencyTypeUsageStats = async (req, res, next) => {
  try {
    const { days = 30, category } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    let matchQuery = {
      createdAt: { $gte: startDate },
      isActive: true
    };

    if (category) {
      matchQuery['emergencyType.category'] = category;
    }

    const usageStats = await Incident.aggregate([
      {
        $match: matchQuery
      },
      {
        $group: {
          _id: "$emergencyTypeCode",
          count: { $sum: 1 },
          avgResponseTime: { $avg: "$responseTime" },
          avgResolutionTime: { $avg: "$resolutionTime" },
          resolvedCount: {
            $sum: { $cond: [{ $eq: ["$status", "RESOLVED"] }, 1, 0] }
          },
          cancelledCount: {
            $sum: { $cond: [{ $eq: ["$status", "CANCELLED"] }, 1, 0] }
          },
          priorities: {
            $push: "$priority"
          }
        }
      },
      {
        $lookup: {
          from: "emergencytypes",
          localField: "_id",
          foreignField: "code",
          as: "typeInfo"
        }
      },
      {
        $unwind: {
          path: "$typeInfo",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          code: "$_id",
          count: 1,
          avgResponseTime: 1,
          avgResolutionTime: 1,
          successRate: {
            $multiply: [
              { $divide: ["$resolvedCount", "$count"] },
              100
            ]
          },
          cancellationRate: {
            $multiply: [
              { $divide: ["$cancelledCount", "$count"] },
              100
            ]
          },
          name: "$typeInfo.name",
          priority: "$typeInfo.priority",
          category: "$typeInfo.category",
          isActive: "$typeInfo.isActive",
          requiresPolice: "$typeInfo.requiresPolice",
          requiresAmbulance: "$typeInfo.requiresAmbulance",
          requiresFirefighter: "$typeInfo.requiresFirefighter",
          priorityDistribution: {
            critical: {
              $size: {
                $filter: {
                  input: "$priorities",
                  as: "p",
                  cond: { $eq: ["$$p", 4] }
                }
              }
            },
            high: {
              $size: {
                $filter: {
                  input: "$priorities",
                  as: "p",
                  cond: { $eq: ["$$p", 3] }
                }
              }
            },
            medium: {
              $size: {
                $filter: {
                  input: "$priorities",
                  as: "p",
                  cond: { $eq: ["$$p", 2] } // CORREGIDO: era 1, ahora es 2
                }
              }
            },
            low: {
              $size: {
                $filter: {
                  input: "$priorities",
                  as: "p",
                  cond: { $eq: ["$$p", 1] } // AGREGADO: para prioridad baja
                }
              }
            }
          }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Calcular estadísticas generales
    const totalStats = {
      totalIncidents: usageStats.reduce((sum, stat) => sum + stat.count, 0),
      avgSuccessRate: usageStats.length > 0 ? 
        usageStats.reduce((sum, stat) => sum + stat.successRate, 0) / usageStats.length : 0,
      mostUsed: usageStats[0] || null,
      byCategory: {}
    };

    // Agrupar por categoría
    usageStats.forEach(stat => {
      if (!totalStats.byCategory[stat.category]) {
        totalStats.byCategory[stat.category] = {
          count: 0,
          types: []
        };
      }
      totalStats.byCategory[stat.category].count += stat.count;
      totalStats.byCategory[stat.category].types.push(stat);
    });

    success(res, {
      period: {
        startDate,
        endDate: new Date(),
        days: parseInt(days)
      },
      stats: usageStats,
      summary: totalStats
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/emergency-types/categories/list - Listar todas las categorías (PÚBLICO)
exports.getEmergencyTypeCategories = async (req, res, next) => {
  try {
    const categories = await EmergencyType.aggregate([
      {
        $match: { isActive: true }
      },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          avgPriority: { $avg: "$priority" },
          types: {
            $push: {
              code: "$code",
              name: "$name",
              priority: "$priority",
              responseTime: "$responseTime"
            }
          }
        }
      },
      {
        $project: {
          category: "$_id",
          count: 1,
          avgPriority: { $round: ["$avgPriority", 2] },
          types: { $slice: ["$types", 10] },
          _id: 0
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    success(res, categories);
  } catch (err) {
    next(err);
  }
};

// POST /api/emergency-types/:code/record-usage - Registrar uso de tipo de emergencia (INTERNO)
exports.recordEmergencyTypeUsage = async (req, res, next) => {
  try {
    const { resolutionTime, successful = true } = req.body;

    const emergencyType = await EmergencyType.findOne({ 
      code: req.params.code.toUpperCase() 
    });

    if (!emergencyType) {
      return error(res, 'Tipo de emergencia no encontrado', 404);
    }

    await emergencyType.recordUsage(resolutionTime);
    await emergencyType.updateSuccessRate(successful);

    const updatedType = await EmergencyType.findOne({ 
      code: req.params.code.toUpperCase() 
    }).select('code name usageCount averageResolutionTime successRate');

    success(res, updatedType, 'Uso registrado exitosamente');
  } catch (err) {
    next(err);
  }
};

// GET /api/emergency-types/operational/active - Obtener tipos activos para operaciones (PÚBLICO)
exports.getActiveOperationalTypes = async (req, res, next) => {
  try {
    const emergencyTypes = await EmergencyType.find({ 
      isActive: true 
    })
    .select('code name priority responseTime color icon category requiresPolice requiresAmbulance requiresFirefighter autoAssign')
    .sort({ priority: -1, name: 1 });

    success(res, {
      count: emergencyTypes.length,
      emergencyTypes: emergencyTypes.map(et => ({
        code: et.code,
        name: et.name,
        priority: et.priority,
        responseTime: et.responseTime,
        color: et.color,
        icon: et.icon,
        category: et.category,
        requiresPolice: et.requiresPolice,
        requiresAmbulance: et.requiresAmbulance,
        requiresFirefighter: et.requiresFirefighter,
        autoAssign: et.autoAssign
      }))
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/emergency-types/:code/incidents - Obtener incidentes por tipo de emergencia (SOLO ADMIN/OPERATOR)
exports.getIncidentsByEmergencyType = async (req, res, next) => {
  try {
    const { days = 30, status, page = 1, limit = 20 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    let matchQuery = {
      emergencyTypeCode: req.params.code.toUpperCase(),
      createdAt: { $gte: startDate },
      isActive: true
    };

    if (status) {
      matchQuery.status = status;
    }

    const incidents = await Incident.find(matchQuery)
      .populate('requesterId', 'fullName phoneNumber')
      .populate('assignees.officerId', 'fullName badgeNumber rank')
      .select('-__v')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Incident.countDocuments(matchQuery);

    // Obtener estadísticas del tipo de emergencia
    const emergencyType = await EmergencyType.findOne({ 
      code: req.params.code.toUpperCase() 
    }).select('name description priority usageCount');

    success(res, {
      emergencyType: {
        code: req.params.code.toUpperCase(),
        name: emergencyType?.name,
        description: emergencyType?.description,
        priority: emergencyType?.priority,
        usageCount: emergencyType?.usageCount
      },
      incidents,
      period: `${days} días`,
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