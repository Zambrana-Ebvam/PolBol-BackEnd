const Location = require('../models/Location');
const User = require('../models/User');
const Incident = require('../models/Incident');
const { success, error } = require('../utils/responseHelpers');

// POST /api/locations - Actualizar o crear ubicación de usuario
exports.updateLocation = async (req, res, next) => {
  try {
    const { userId, lon, lat, accuracyM, headingDeg, speedMps, deviceInfo } = req.body;

    // Validaciones
    if (!userId || lon === undefined || lat === undefined) {
      return error(res, 'ID de usuario, longitud y latitud son requeridos', 400);
    }

    // Verificar que el usuario existe
    const user = await User.findById(userId);
    if (!user) {
      return error(res, 'Usuario no encontrado', 404);
    }

    const locationData = {
      coords: { 
        type: 'Point', 
        coordinates: [parseFloat(lon), parseFloat(lat)] 
      },
      accuracyM: accuracyM ? parseFloat(accuracyM) : undefined,
      headingDeg: headingDeg ? parseFloat(headingDeg) : undefined,
      speedMps: speedMps ? parseFloat(speedMps) : undefined,
      deviceInfo
    };

    const location = await Location.findOneAndUpdate(
      { userId },
      { $set: locationData },
      { 
        upsert: true, 
        new: true,
        runValidators: true 
      }
    ).populate('userId', 'fullName role badgeNumber rank unit');

    // Actualizar lastLocationUpdate en el usuario si es oficial
    if (user.role === 'OFFICER') {
      await User.findByIdAndUpdate(userId, { 
        lastLocationUpdate: new Date() 
      });
    }

    success(res, location.toMapFormat(), 'Ubicación actualizada exitosamente');
  } catch (err) {
    next(err);
  }
};

// GET /api/locations/nearby - Buscar oficiales cercanos con filtros avanzados
exports.getNearbyOfficers = async (req, res, next) => {
  try {
    const lon = parseFloat(req.query.lon);
    const lat = parseFloat(req.query.lat);
    const radius = parseInt(req.query.radius) || 5000; // metros
    const limit = parseInt(req.query.limit) || 20;
    const maxAge = parseInt(req.query.maxAge) || 15; // minutos
    const specialization = req.query.specialization;
    const rank = req.query.rank;

    // Validaciones
    if (isNaN(lon) || isNaN(lat)) {
      return error(res, 'Se requieren parámetros de longitud y latitud válidos', 400);
    }

    let nearbyOfficers = await Location.findNearby([lon, lat], radius, limit);

    // Filtros adicionales
    if (specialization) {
      nearbyOfficers = nearbyOfficers.filter(officer => 
        officer.user.specialization && 
        officer.user.specialization.includes(specialization)
      );
    }

    if (rank) {
      nearbyOfficers = nearbyOfficers.filter(officer => 
        officer.user.rank === rank
      );
    }

    // Formatear respuesta
    const formattedOfficers = nearbyOfficers.map(officer => ({
      _id: officer._id,
      userId: officer.userId,
      coordinates: officer.coords.coordinates,
      distance: officer.distance,
      accuracyM: officer.accuracyM,
      updatedAt: officer.updatedAt,
      isRecent: officer.isRecent,
      isAccurate: officer.isAccurate,
      isMoving: officer.isMoving,
      officer: {
        _id: officer.user._id,
        fullName: officer.user.fullName,
        badgeNumber: officer.user.badgeNumber,
        rank: officer.user.rank,
        unit: officer.user.unit,
        specialization: officer.user.specialization,
        phoneNumber: officer.user.phoneNumber,
        isAvailable: officer.user.isAvailable
      }
    }));

    success(res, {
      center: { lon, lat },
      radius,
      maxAge: `${maxAge} minutos`,
      count: formattedOfficers.length,
      officers: formattedOfficers
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/locations - Listar todas las ubicaciones con filtros
exports.getLocations = async (req, res, next) => {
  try {
    const { 
      role, 
      recent = true, 
      limit = 100,
      isAvailable,
      zone,
      district 
    } = req.query;
    
    let query = { isActive: true };
    
    // Filtrar por usuarios recientes (últimas 2 horas)
    if (recent === 'true') {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      query.updatedAt = { $gte: twoHoursAgo };
    }

    if (zone) query.zone = zone;
    if (district) query.district = district;

    const locations = await Location.find(query)
      .populate('userId', 'fullName role badgeNumber rank unit isActive isAvailable')
      .select('-__v')
      .sort({ updatedAt: -1 })
      .limit(parseInt(limit));

    // Filtrar por rol y disponibilidad
    let filteredLocations = locations;
    if (role) {
      filteredLocations = filteredLocations.filter(
        loc => loc.userId && loc.userId.role === role
      );
    }

    if (isAvailable === 'true') {
      filteredLocations = filteredLocations.filter(
        loc => loc.userId && loc.userId.isAvailable === true
      );
    }

    success(res, {
      count: filteredLocations.length,
      locations: filteredLocations.map(loc => ({
        ...loc.toMapFormat(),
        user: loc.userId.getPublicProfile ? loc.userId.getPublicProfile() : loc.userId
      }))
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/locations/user/:userId - Obtener ubicación de usuario específico
exports.getUserLocation = async (req, res, next) => {
  try {
    const location = await Location.findOne({ userId: req.params.userId })
      .populate('userId', 'fullName role badgeNumber rank unit phoneNumber')
      .select('-__v');

    if (!location) {
      return error(res, 'Ubicación no encontrada para este usuario', 404);
    }

    success(res, {
      ...location.toMapFormat(),
      user: location.userId.getPublicProfile ? location.userId.getPublicProfile() : location.userId
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/locations/stats/active-officers - Estadísticas de oficiales activos
exports.getActiveOfficersStats = async (req, res, next) => {
  try {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    const stats = await Location.aggregate([
      {
        $match: {
          updatedAt: { $gte: fifteenMinutesAgo },
          isActive: true
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
          "user.isActive": true
        }
      },
      {
        $facet: {
          totalActive: [{ $count: "count" }],
          byUnit: [
            {
              $group: {
                _id: "$user.unit",
                count: { $sum: 1 },
                available: {
                  $sum: { $cond: ['$user.isAvailable', 1, 0] }
                },
                officers: {
                  $push: {
                    _id: "$user._id",
                    name: "$user.fullName",
                    badge: "$user.badgeNumber",
                    rank: "$user.rank",
                    isAvailable: "$user.isAvailable",
                    lastUpdate: "$updatedAt",
                    coordinates: "$coords.coordinates"
                  }
                }
              }
            },
            { $sort: { count: -1 } }
          ],
          byZone: [
            {
              $group: {
                _id: "$zone",
                count: { $sum: 1 },
                available: {
                  $sum: { $cond: ['$user.isAvailable', 1, 0] }
                }
              }
            },
            { $sort: { count: -1 } }
          ],
          bySpecialization: [
            { $unwind: "$user.specialization" },
            {
              $group: {
                _id: "$user.specialization",
                count: { $sum: 1 }
              }
            },
            { $sort: { count: -1 } }
          ],
          recentActivity: [
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: "%H:%M",
                    date: "$updatedAt"
                  }
                },
                count: { $sum: 1 }
              }
            },
            { $sort: { _id: 1 } },
            { $limit: 10 }
          ]
        }
      }
    ]);

    const result = stats[0];
    
    success(res, {
      totalActive: result.totalActive[0]?.count || 0,
      available: result.byUnit.reduce((sum, unit) => sum + unit.available, 0),
      byUnit: result.byUnit,
      byZone: result.byZone,
      bySpecialization: result.bySpecialization,
      recentActivity: result.recentActivity,
      lastUpdated: new Date()
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/locations/heatmap - Datos para mapa de calor de incidentes
exports.getHeatmapData = async (req, res, next) => {
  try {
    const { days = 7, emergencyTypeCode, priority } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    let matchQuery = {
      createdAt: { $gte: startDate },
      isActive: true,
      requesterLocation: { $exists: true }
    };

    if (emergencyTypeCode) {
      matchQuery.emergencyTypeCode = emergencyTypeCode.toUpperCase();
    }

    if (priority) {
      matchQuery.priority = parseInt(priority);
    }

    const heatmapData = await Incident.aggregate([
      {
        $match: matchQuery
      },
      {
        $group: {
          _id: {
            lat: { $arrayElemAt: ["$requesterLocation.coordinates", 1] },
            lon: { $arrayElemAt: ["$requesterLocation.coordinates", 0] }
          },
          count: { $sum: 1 },
          types: { $addToSet: "$emergencyTypeCode" },
          avgPriority: { $avg: "$priority" },
          resolved: {
            $sum: { $cond: [{ $eq: ["$status", "RESOLVED"] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          lat: "$_id.lat",
          lon: "$_id.lon",
          count: 1,
          types: 1,
          avgPriority: 1,
          resolutionRate: {
            $multiply: [
              { $divide: ["$resolved", "$count"] },
              100
            ]
          },
          _id: 0
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 1000 // Límite para performance
      }
    ]);

    success(res, {
      period: `${days} días`,
      totalPoints: heatmapData.length,
      data: heatmapData
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/locations/zones/coverage - Cobertura por zonas
exports.getZoneCoverage = async (req, res, next) => {
  try {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    const coverage = await Location.aggregate([
      {
        $match: {
          updatedAt: { $gte: fifteenMinutesAgo },
          isActive: true
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
          "user.isActive": true
        }
      },
      {
        $group: {
          _id: {
            zone: "$zone",
            district: "$district"
          },
          officerCount: { $sum: 1 },
          availableOfficers: {
            $sum: { $cond: ['$user.isAvailable', 1, 0] }
          },
          locations: {
            $push: {
              officerId: "$user._id",
              badgeNumber: "$user.badgeNumber",
              rank: "$user.rank",
              coordinates: "$coords.coordinates",
              updatedAt: "$updatedAt",
              isAvailable: "$user.isAvailable"
            }
          },
          avgAccuracy: { $avg: "$accuracyM" }
        }
      },
      {
        $project: {
          zone: "$_id.zone",
          district: "$_id.district",
          officerCount: 1,
          availableOfficers: 1,
          coveragePercentage: {
            $multiply: [
              { $divide: ["$availableOfficers", "$officerCount"] },
              100
            ]
          },
          avgAccuracy: 1,
          locations: 1,
          _id: 0
        }
      },
      {
        $sort: { officerCount: -1 }
      }
    ]);

    // Calcular estadísticas generales
    const totalOfficers = coverage.reduce((sum, zone) => sum + zone.officerCount, 0);
    const totalAvailable = coverage.reduce((sum, zone) => sum + zone.availableOfficers, 0);

    success(res, {
      summary: {
        totalZones: coverage.length,
        totalOfficers,
        totalAvailable,
        overallCoverage: totalOfficers > 0 ? (totalAvailable / totalOfficers) * 100 : 0
      },
      zones: coverage
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/locations/user/:userId - Eliminar ubicación de usuario
exports.deleteUserLocation = async (req, res, next) => {
  try {
    const location = await Location.findOneAndDelete({ 
      userId: req.params.userId 
    });

    if (!location) {
      return error(res, 'Ubicación no encontrada para este usuario', 404);
    }

    success(res, {
      deletedLocation: location.toMapFormat()
    }, 'Ubicación eliminada exitosamente');
  } catch (err) {
    next(err);
  }
};

// POST /api/locations/bulk-update - Actualización masiva de ubicaciones
exports.bulkUpdateLocations = async (req, res, next) => {
  try {
    const { locations } = req.body;

    if (!Array.isArray(locations) || locations.length === 0) {
      return error(res, 'Se requiere un array de ubicaciones', 400);
    }

    const results = [];
    const errors = [];

    for (const locData of locations) {
      try {
        const { userId, lon, lat, accuracyM, headingDeg, speedMps, deviceInfo } = locData;

        // Validaciones básicas
        if (!userId || lon === undefined || lat === undefined) {
          errors.push({ userId, error: 'Datos incompletos' });
          continue;
        }

        // Verificar que el usuario existe
        const user = await User.findById(userId);
        if (!user) {
          errors.push({ userId, error: 'Usuario no encontrado' });
          continue;
        }

        const locationData = {
          coords: { 
            type: 'Point', 
            coordinates: [parseFloat(lon), parseFloat(lat)] 
          },
          accuracyM: accuracyM ? parseFloat(accuracyM) : undefined,
          headingDeg: headingDeg ? parseFloat(headingDeg) : undefined,
          speedMps: speedMps ? parseFloat(speedMps) : undefined,
          deviceInfo
        };

        const location = await Location.findOneAndUpdate(
          { userId },
          { $set: locationData },
          { 
            upsert: true, 
            new: true,
            runValidators: true 
          }
        );

        results.push({
          userId,
          success: true,
          location: location.toMapFormat()
        });

        // Actualizar lastLocationUpdate para oficiales
        if (user.role === 'OFFICER') {
          await User.findByIdAndUpdate(userId, { 
            lastLocationUpdate: new Date() 
          });
        }

      } catch (err) {
        errors.push({ 
          userId: locData.userId, 
          error: err.message 
        });
      }
    }

    success(res, {
      processed: results.length + errors.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors
    });
  } catch (err) {
    next(err);
  }
};