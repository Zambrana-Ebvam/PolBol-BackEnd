const router = require("express").Router();
const Incident = require("../models/Incident");
const Location = require("../models/Location");
const User = require("../models/User");
const auth = require("../middlewares/authMiddleware");
const requireRole = require("../middlewares/roleMiddleware");

// 1) CIVIL crea emergencia
router.post("/", auth, requireRole("CIVIL"), async (req, res) => {
  try {
    const { emergencyTypeCode, lon, lat, details } = req.body;
    if (!emergencyTypeCode || lon == null || lat == null) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    const incident = await Incident.create({
      requesterId: req.user._id,
      emergencyTypeCode,
      initialLocation: { type: "Point", coordinates: [lon, lat] },
      details,
      status: "OPEN",
    });

    res.status(201).json(incident);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// 2) LISTAR INCIDENTES
router.get("/", auth, requireRole("OPERATOR", "ADMIN", "OFFICER"), async (req, res) => {
  try {
    const incidents = await Incident.find()
      .populate("requesterId", "firstName lastName phoneNumber")
      .populate("assignedOfficerId", "firstName lastName policeRank phoneNumber role")
      .sort({ createdAt: -1 });
    res.json(incidents);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ✅ 2.5) DETALLE INCIDENTE (CORREGIDO PARA TRAER TODO)
router.get("/:id", auth, requireRole("OPERATOR", "ADMIN", "OFFICER", "CIVIL"), async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id)
      .populate("requesterId", "firstName lastName phoneNumber role")
      // Traemos todos los datos del oficial asignado actual
      .populate("assignedOfficerId", "firstName lastName phoneNumber policeRank escalafon role")
      // Traemos datos históricos si se necesitan
      .populate("assignees.officerId", "firstName lastName phoneNumber policeRank escalafon role");

    if (!incident) {
      return res.status(404).json({ error: "No existe incidente" });
    }

    // 🔥 TRUCO: Inyectar la ubicación del oficial asignado manualmente si existe
    // Esto asegura que el frontend reciba la ubicación actual del oficial en el objeto del incidente
    if (incident.assignedOfficerId) {
        const officerLoc = await Location.findOne({ userId: incident.assignedOfficerId._id });
        if (officerLoc) {
            // Convertimos a objeto JS plano para poder modificarlo
            const incidentObj = incident.toObject();
            incidentObj.assignedOfficerId.location = officerLoc.coords; // Inyectamos location
            return res.json(incidentObj);
        }
    }

    res.json(incident);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ✅ 3) OFICIALES CERCANOS (CORREGIDO PARA INCLUIR COORDENADAS)
router.get("/:id/nearby-officers", auth, requireRole("OPERATOR", "ADMIN"), async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) return res.status(404).json({ error: "No existe incidente" });

    const maxDistanceM = Number(req.query.maxDistanceM || 3000);

    // 1. Buscar en Location usando $near
    const nearbyLocations = await Location.find({
      coords: {
        $near: {
          $geometry: incident.initialLocation,
          $maxDistance: maxDistanceM,
        },
      },
    }).limit(10);

    // 2. Extraer IDs
    const officerIds = nearbyLocations.map((l) => l.userId);

    // 3. Buscar datos de usuario (nombre, rango, etc)
    const officers = await User.find({
      _id: { $in: officerIds },
      role: "OFFICER",
      isAvailable: true,
    }).select("firstName lastName phoneNumber policeRank escalafon role");

    // 4. COMBINAR DATOS (User + Location)
    // Esto es crucial: el frontend necesita 'coords' dentro del objeto del oficial
    const result = officers.map((officer) => {
      // Encontrar la ubicación correspondiente a este oficial
      const loc = nearbyLocations.find((x) => x.userId.toString() === officer._id.toString());
      return {
        ...officer.toObject(),
        coords: loc ? loc.coords : null,  // Aquí van las coordenadas para el mapa
        distance: loc ? loc.dist : null,  // Distancia calculada por Mongo (si usas aggregate, sino null)
        location: loc ? loc.coords : null // Alias por si el frontend usa .location
      };
    });

    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ✅ 4) ASIGNAR OFICIAL (CORREGIDO: Valida y devuelve datos completos)
router.post("/:id/assign", auth, requireRole("OPERATOR", "ADMIN"), async (req, res) => {
  try {
    const { officerId } = req.body;
    
    // 1. Buscamos el incidente
    const incident = await Incident.findById(req.params.id);
    if (!incident) return res.status(404).json({ error: "No existe incidente" });

    // 2. VERIFICACIÓN DE SEGURIDAD
    // Revisamos si el oficial existe y si tiene el rol correcto en tu BD
    const officer = await User.findById(officerId);
    if (!officer || officer.role !== "OFFICER") {
        return res.status(400).json({ error: "El ID no corresponde a un Oficial válido." });
    }

    // 3. Realizamos la asignación
    incident.assignedOfficerId = officerId;
    
    // Agregamos al historial
    incident.assignees.push({ 
        officerId, 
        assignedAt: new Date() 
    });
    
    incident.status = "ASSIGNED";
    
    await incident.save();

    // 4. EL TRUCO FINAL (POPULATE)
    // Esto hace que el frontend reciba el nombre y rango del policía, no solo el ID.
    const fullIncident = await Incident.findById(incident._id)
        .populate("requesterId", "firstName lastName phoneNumber")
        .populate("assignedOfficerId", "firstName lastName phoneNumber policeRank escalafon role")
        .populate("assignees.officerId", "firstName lastName");

    // ¡Listo! Enviamos el incidente con toda la info del policía
    res.json(fullIncident);

  } catch (e) {
    console.error("Error al asignar oficial:", e);
    res.status(500).json({ error: e.message });
  }
});

// 5) ACEPTAR
router.post("/:id/accept", auth, requireRole("OFFICER"), async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) return res.status(404).json({ error: "No existe incidente" });

    if (!incident.assignedOfficerId?.equals(req.user._id)) {
      return res.status(403).json({ error: "No estás asignado a este incidente" });
    }

    const lastAssign = incident.assignees.slice().reverse().find((a) => a.officerId.equals(req.user._id));
    if (lastAssign) lastAssign.acceptedAt = new Date();
    
    incident.status = "IN_PROGRESS";
    await incident.save();

    res.json(incident);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// 6) LLEGAR
router.post("/:id/arrive", auth, requireRole("OFFICER"), async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) return res.status(404).json({ error: "No existe incidente" });

    const lastAssign = incident.assignees.slice().reverse().find((a) => a.officerId.equals(req.user._id));
    if (lastAssign) lastAssign.arrivedAt = new Date();
    
    await incident.save();
    res.json(incident);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// 7) RESOLVER
router.post("/:id/resolve", auth, requireRole("OFFICER", "OPERATOR", "ADMIN"), async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) return res.status(404).json({ error: "No existe incidente" });

    incident.status = "RESOLVED";
    const lastAssign = incident.assignees[incident.assignees.length - 1];
    if (lastAssign) lastAssign.closedAt = new Date();

    await incident.save();
    res.json(incident);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// 8) CANCELAR
router.post("/:id/cancel", auth, requireRole("CIVIL"), async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) return res.status(404).json({ error: "No existe incidente" });

    if (!incident.requesterId.equals(req.user._id)) {
      return res.status(403).json({ error: "No puedes cancelar este incidente" });
    }

    incident.status = "CANCELLED";
    await incident.save();
    res.json(incident);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// 9) TRACKING
router.get("/:id/tracking", auth, async (req, res) => {
    try {
        const incident = await Incident.findById(req.params.id)
            .populate("requesterId", "firstName lastName phoneNumber")
            .populate("assignedOfficerId", "firstName lastName phoneNumber policeRank unit");
        
        if (!incident) return res.status(404).json({ error: "Incidente no encontrado" });

        // Ubicación Civil
        const civilLoc = await Location.findOne({ userId: incident.requesterId._id });
        
        // Ubicación Oficial
        let officerLocation = null;
        if (incident.assignedOfficerId) {
            const loc = await Location.findOne({ userId: incident.assignedOfficerId._id });
            if (loc) officerLocation = loc;
        }

        // Calcular Distancia
        let distance = null;
        if (officerLocation && incident.initialLocation) {
             const R = 6371e3; // Metros
             const lat1 = officerLocation.coords.coordinates[1] * Math.PI/180;
             const lat2 = incident.initialLocation.coordinates[1] * Math.PI/180;
             const dLat = (lat2 - lat1);
             const dLon = (incident.initialLocation.coordinates[0] - officerLocation.coords.coordinates[0]) * Math.PI/180;
             const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                       Math.cos(lat1) * Math.cos(lat2) *
                       Math.sin(dLon/2) * Math.sin(dLon/2);
             const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
             distance = R * c; 
        }

        res.json({
            incidentId: incident._id,
            status: incident.status,
            civil: {
                ...incident.requesterId._doc,
                location: civilLoc ? civilLoc.coords : incident.initialLocation
            },
            officer: incident.assignedOfficerId ? {
                ...incident.assignedOfficerId._doc,
                location: officerLocation ? officerLocation.coords : null
            } : null,
            distance: distance
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;