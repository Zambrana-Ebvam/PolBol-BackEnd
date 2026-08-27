const Location = require("../models/Location");
const { USER_ROLES } = require("../constants/emergencyTypes");

// Actualizar o insertar ubicación del usuario autenticado
const updateMyLocation = async (req, res, next) => {
  try {
    const { lon, lat, accuracyM, headingDeg, speedMps } = req.body;

    if (lon == null || lat == null) {
      return res.status(400).json({ error: "lon y lat son obligatorios" });
    }

    const coordinates = [parseFloat(lon), parseFloat(lat)];
    if (isNaN(coordinates[0]) || isNaN(coordinates[1])) {
      return res.status(400).json({ error: "Las coordenadas deben ser números válidos" });
    }

    const locationDoc = await Location.findOneAndUpdate(
      { userId: req.user._id },
      {
        $set: {
          coords: { type: "Point", coordinates },
          accuracyM: accuracyM != null ? parseFloat(accuracyM) : null,
          headingDeg: headingDeg != null ? parseFloat(headingDeg) : null,
          speedMps: speedMps != null ? parseFloat(speedMps) : null,
          updatedAt: new Date(),
        },
      },
      { upsert: true, new: true, runValidators: true }
    );

    res.json(locationDoc);
  } catch (err) {
    next(err);
  }
};

// Búsqueda general de oficiales cercanos por coordenadas
const getNearbyOfficers = async (req, res, next) => {
  try {
    const lon = parseFloat(req.query.lon);
    const lat = parseFloat(req.query.lat);
    const radius = parseInt(req.query.radius || 3000);
    const limit = parseInt(req.query.limit || 10);

    if (isNaN(lon) || isNaN(lat)) {
      return res.status(400).json({ error: "Los parámetros de consulta 'lon' y 'lat' son obligatorios y deben ser numéricos" });
    }

    const results = await Location.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [lon, lat] },
          distanceField: "dist",
          spherical: true,
          maxDistance: radius,
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
          userId: 1,
          coords: 1,
          updatedAt: 1,
          "user.firstName": 1,
          "user.lastName": 1,
          "user.phoneNumber": 1,
          "user.policeRank": 1,
          "user.escalafon": 1,
          dist: 1,
        },
      },
      { $limit: limit },
    ]);

    res.json(results);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  updateMyLocation,
  getNearbyOfficers,
};
