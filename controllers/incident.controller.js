const Incident = require("../models/Incident");
const Location = require("../models/Location");
const User = require("../models/User");
const { EMERGENCY_TYPES, INCIDENT_STATUS, USER_ROLES } = require("../constants/emergencyTypes");
const { sendExpoPushNotification } = require("../services/pushNotification.service");

// 1. CIVIL crea emergencia
const createIncident = async (req, res, next) => {
  try {
    const { emergencyTypeCode, lon, lat, details, priority } = req.body;

    if (!emergencyTypeCode || lon == null || lat == null) {
      return res.status(400).json({ error: "emergencyTypeCode, lon y lat son obligatorios" });
    }

    const allowedCodes = EMERGENCY_TYPES.map((e) => e.code);
    if (!allowedCodes.includes(emergencyTypeCode)) {
      return res.status(400).json({
        error: "Tipo de emergencia inválido",
        permitidos: allowedCodes,
      });
    }

    const initialCoordinates = [parseFloat(lon), parseFloat(lat)];

    const incident = await Incident.create({
      requesterId: req.user._id,
      emergencyTypeCode,
      initialLocation: {
        type: "Point",
        coordinates: initialCoordinates,
      },
      details: details || {},
      priority: priority || 1,
      status: INCIDENT_STATUS.OPEN,
      timeline: [
        {
          status: INCIDENT_STATUS.OPEN,
          updatedBy: req.user._id,
          note: "Incidente reportado por el ciudadano",
          timestamp: new Date(),
        },
      ],
    });

    res.status(201).json(incident);
  } catch (err) {
    next(err);
  }
};

// 2. Listar incidentes (para OPERATOR, ADMIN, OFFICER)
const listIncidents = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const incidents = await Incident.find(filter)
      .populate("requesterId", "firstName lastName phoneNumber")
      .populate("assignedOfficerId", "firstName lastName policeRank phoneNumber escalafon")
      .sort({ createdAt: -1 });

    res.json(incidents);
  } catch (err) {
    next(err);
  }
};

// 3. Detalle de incidente por ID
const getIncidentById = async (req, res, next) => {
  try {
    const incident = await Incident.findById(req.params.id)
      .populate("requesterId", "firstName lastName phoneNumber role")
      .populate("assignedOfficerId", "firstName lastName phoneNumber policeRank escalafon role")
      .populate("assignees.officerId", "firstName lastName phoneNumber policeRank escalafon");

    if (!incident) {
      return res.status(404).json({ error: "Incidente no encontrado" });
    }

    // Inyectar ubicación del oficial si está asignado
    let incidentResponse = incident.toObject();
    if (incident.assignedOfficerId) {
      const officerLoc = await Location.findOne({ userId: incident.assignedOfficerId._id });
      if (officerLoc) {
        incidentResponse.assignedOfficerId.location = officerLoc.coords;
      }
    }

    res.json(incidentResponse);
  } catch (err) {
    next(err);
  }
};

// 4. Buscar oficiales cercanos a un incidente
const getNearbyOfficersForIncident = async (req, res, next) => {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) {
      return res.status(404).json({ error: "Incidente no encontrado" });
    }

    const maxDistanceM = parseInt(req.query.maxDistanceM || req.query.radius || 3000);
    const limit = parseInt(req.query.limit || 10);
    const [lon, lat] = incident.initialLocation.coordinates;

    const nearbyResults = await Location.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [lon, lat] },
          distanceField: "dist",
          spherical: true,
          maxDistance: maxDistanceM,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $match: {
          "user.role": USER_ROLES.OFFICER,
          "user.isAvailable": true,
        },
      },
      {
        $project: {
          _id: "$user._id",
          firstName: "$user.firstName",
          lastName: "$user.lastName",
          phoneNumber: "$user.phoneNumber",
          policeRank: "$user.policeRank",
          escalafon: "$user.escalafon",
          role: "$user.role",
          coords: "$coords",
          distance: "$dist",
          updatedAt: "$updatedAt",
        },
      },
      { $limit: limit },
    ]);

    res.json(nearbyResults);
  } catch (err) {
    next(err);
  }
};

// 5. Asignar oficial a un incidente (OPERATOR / ADMIN)
const assignOfficer = async (req, res, next) => {
  try {
    const { officerId } = req.body;
    const incidentId = req.params.id;

    if (!officerId) {
      return res.status(400).json({ error: "El campo officerId es obligatorio" });
    }

    const incident = await Incident.findById(incidentId);
    if (!incident) {
      return res.status(404).json({ error: "Incidente no encontrado" });
    }

    const officer = await User.findById(officerId);
    if (!officer || officer.role !== USER_ROLES.OFFICER) {
      return res.status(400).json({ error: "El usuario seleccionado no es un oficial de policía válido" });
    }

    incident.assignedOfficerId = officerId;
    incident.assignees.push({
      officerId,
      assignedAt: new Date(),
    });
    incident.status = INCIDENT_STATUS.ASSIGNED;
    incident.timeline.push({
      status: INCIDENT_STATUS.ASSIGNED,
      updatedBy: req.user._id,
      note: `Oficial ${officer.policeRank || ''} ${officer.firstName} ${officer.lastName} asignado al caso.`,
      timestamp: new Date(),
    });

    await incident.save();

    // Disparar Notificación Push si el oficial tiene token registrado
    if (officer.expoPushToken) {
      sendExpoPushNotification(
        officer.expoPushToken,
        "🚨 Nueva Emergencia Asignada",
        `Se te ha asignado un incidente de tipo: ${incident.emergencyTypeCode}`,
        { incidentId: incident._id }
      );
    }

    const fullIncident = await Incident.findById(incident._id)
      .populate("requesterId", "firstName lastName phoneNumber")
      .populate("assignedOfficerId", "firstName lastName phoneNumber policeRank escalafon role")
      .populate("assignees.officerId", "firstName lastName policeRank");

    res.json(fullIncident);
  } catch (err) {
    next(err);
  }
};

// 6. OFICIAL acepta el incidente
const acceptIncident = async (req, res, next) => {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) {
      return res.status(404).json({ error: "Incidente no encontrado" });
    }

    if (!incident.assignedOfficerId?.equals(req.user._id)) {
      return res.status(403).json({ error: "No estás asignado a este incidente" });
    }

    const lastAssign = incident.assignees
      .slice()
      .reverse()
      .find((a) => a.officerId.equals(req.user._id));

    if (lastAssign) lastAssign.acceptedAt = new Date();

    incident.status = INCIDENT_STATUS.IN_PROGRESS;
    incident.timeline.push({
      status: INCIDENT_STATUS.IN_PROGRESS,
      updatedBy: req.user._id,
      note: "El oficial ha aceptado la misión y se encuentra en camino",
      timestamp: new Date(),
    });

    await incident.save();
    res.json(incident);
  } catch (err) {
    next(err);
  }
};

// 7. OFICIAL marca llegada al lugar
const arriveIncident = async (req, res, next) => {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) {
      return res.status(404).json({ error: "Incidente no encontrado" });
    }

    if (!incident.assignedOfficerId?.equals(req.user._id)) {
      return res.status(403).json({ error: "No estás asignado a este incidente" });
    }

    const lastAssign = incident.assignees
      .slice()
      .reverse()
      .find((a) => a.officerId.equals(req.user._id));

    if (lastAssign) lastAssign.arrivedAt = new Date();

    incident.timeline.push({
      status: incident.status,
      updatedBy: req.user._id,
      note: "El oficial ha llegado al lugar del incidente",
      timestamp: new Date(),
    });

    await incident.save();
    res.json(incident);
  } catch (err) {
    next(err);
  }
};

// 8. Resolver incidente (OFFICER, OPERATOR, ADMIN)
const resolveIncident = async (req, res, next) => {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) {
      return res.status(404).json({ error: "Incidente no encontrado" });
    }

    incident.status = INCIDENT_STATUS.RESOLVED;

    const lastAssign = incident.assignees[incident.assignees.length - 1];
    if (lastAssign) lastAssign.closedAt = new Date();

    incident.timeline.push({
      status: INCIDENT_STATUS.RESOLVED,
      updatedBy: req.user._id,
      note: req.body.note || "Incidente resuelto y cerrado",
      timestamp: new Date(),
    });

    await incident.save();
    res.json(incident);
  } catch (err) {
    next(err);
  }
};

// 9. CIVIL o ADMIN cancela incidente
const cancelIncident = async (req, res, next) => {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) {
      return res.status(404).json({ error: "Incidente no encontrado" });
    }

    const isRequester = incident.requesterId.equals(req.user._id);
    const isAdmin = req.user.role === USER_ROLES.ADMIN;

    if (!isRequester && !isAdmin) {
      return res.status(403).json({ error: "No tienes permisos para cancelar este incidente" });
    }

    incident.status = INCIDENT_STATUS.CANCELLED;
    incident.timeline.push({
      status: INCIDENT_STATUS.CANCELLED,
      updatedBy: req.user._id,
      note: req.body.note || "Incidente cancelado",
      timestamp: new Date(),
    });

    await incident.save();
    res.json(incident);
  } catch (err) {
    next(err);
  }
};

// 10. Tracking en vivo de incidente
const getIncidentTracking = async (req, res, next) => {
  try {
    const incident = await Incident.findById(req.params.id)
      .populate("requesterId", "firstName lastName phoneNumber")
      .populate("assignedOfficerId", "firstName lastName phoneNumber policeRank");

    if (!incident) {
      return res.status(404).json({ error: "Incidente no encontrado" });
    }

    const civilLoc = await Location.findOne({ userId: incident.requesterId._id });

    let officerLoc = null;
    if (incident.assignedOfficerId) {
      officerLoc = await Location.findOne({ userId: incident.assignedOfficerId._id });
    }

    // Cálculo de distancia mediante fórmula de Haversine
    let distanceMeters = null;
    if (officerLoc?.coords?.coordinates && incident.initialLocation?.coordinates) {
      const R = 6371e3; // Radio de la tierra en metros
      const [lon1, lat1] = officerLoc.coords.coordinates;
      const [lon2, lat2] = incident.initialLocation.coordinates;

      const φ1 = (lat1 * Math.PI) / 180;
      const φ2 = (lat2 * Math.PI) / 180;
      const Δφ = ((lat2 - lat1) * Math.PI) / 180;
      const Δλ = ((lon2 - lon1) * Math.PI) / 180;

      const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      distanceMeters = Math.round(R * c);
    }

    res.json({
      incidentId: incident._id,
      status: incident.status,
      emergencyTypeCode: incident.emergencyTypeCode,
      distanceMeters: distanceMeters,
      civil: {
        userId: incident.requesterId._id,
        firstName: incident.requesterId.firstName,
        lastName: incident.requesterId.lastName,
        phoneNumber: incident.requesterId.phoneNumber,
        location: civilLoc?.coords || incident.initialLocation,
        updatedAt: civilLoc?.updatedAt || null,
      },
      officer: incident.assignedOfficerId
        ? {
            userId: incident.assignedOfficerId._id,
            firstName: incident.assignedOfficerId.firstName,
            lastName: incident.assignedOfficerId.lastName,
            phoneNumber: incident.assignedOfficerId.phoneNumber,
            policeRank: incident.assignedOfficerId.policeRank,
            location: officerLoc?.coords || null,
            updatedAt: officerLoc?.updatedAt || null,
          }
        : null,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createIncident,
  listIncidents,
  getIncidentById,
  getNearbyOfficersForIncident,
  assignOfficer,
  acceptIncident,
  arriveIncident,
  resolveIncident,
  cancelIncident,
  getIncidentTracking,
};
