require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const User = require("./models/User");
const Location = require("./models/Location");
const Incident = require("./models/Incident");

const authMiddleware = require("./middlewares/authMiddleware");
const requireRole = require("./middlewares/roleMiddleware");

const app = express();
app.use(cors());
app.use(express.json());

const { MONGO_URI, PORT = 3000 } = process.env;

// CONEXIÓN A MONGO
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("Mongo connected"))
  .catch((err) => {
    console.error("Mongo connection error", err);
    process.exit(1);
  });

/* -------------------------------------------------------------
   🚨 TIPOS DE EMERGENCIA
------------------------------------------------------------- */
// Tipos de emergencia comunes (para CIVIL)
const EMERGENCY_TYPES = [
  { code: "ROBO", label: "Robo / Asalto" },
  { code: "VIOLENCIA", label: "Violencia / Agresión" },
  { code: "ACCIDENTE", label: "Accidente de tránsito" },
  { code: "INCENDIO", label: "Incendio" },
  { code: "SALUD", label: "Emergencia médica" },
  { code: "PERSONA_SOSPECHOSA", label: "Persona sospechosa" },
  { code: "OTRO", label: "Otro" },
];

// endpoint público para que la app los liste
app.get("/emergency-types", (req, res) => {
  res.json(EMERGENCY_TYPES);
});

/* -------------------------------------------------------------
   ✅ AUTH (REGISTER / LOGIN)
------------------------------------------------------------- */
const jwt = require("jsonwebtoken");

// register - VERSIÓN ACTUALIZADA CON VALIDACIÓN DE OFICIAL
app.post("/auth/register", async (req, res) => {
  try {
    const {
      email,
      password,
      role,
      firstName,
      lastName,
      phoneNumber,
      ci,
      birthDate,
      policeRank,
      escalafon
    } = req.body;

    // ✅ VALIDACIÓN 1: Campos requeridos (incluyendo email ahora)
    if (!email || !firstName || !lastName || !phoneNumber || !ci || !birthDate || !role || !password) {
      return res.status(400).json({
        error: "email, firstName, lastName, phoneNumber, ci, birthDate, role, password required",
      });
    }

    // ✅ VALIDACIÓN 2: Solo CIVIL y OFFICER pueden registrarse por la app
    const SELF_REGISTER_ROLES = ["CIVIL", "OFFICER"];
    if (!SELF_REGISTER_ROLES.includes(role)) {
      return res.status(403).json({
        error: "Solo CIVIL y OFFICER pueden registrarse desde la app"
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password muy corta (>=6)" });
    }

    // ✅ VALIDACIÓN 3: Email único
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ error: "Email ya registrado" });

    // Validación para campos obligatorios de oficial
    if (role === "OFFICER") {
      if (!policeRank || !escalafon) {
        return res.status(400).json({
          error: "Para OFFICER se requiere policeRank y escalafon"
        });
      }
    }

    const user = new User({
      email,
      passwordHash: "temp",
      role,
      firstName,
      lastName,
      phoneNumber,
      ci,
      birthDate,
      policeRank,
      escalafon
    });

    await user.setPassword(password);
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ user: { ...user.toObject(), passwordHash: undefined }, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// login
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Credenciales inválidas" });

    const ok = await user.checkPassword(password);
    if (!ok) return res.status(401).json({ error: "Credenciales inválidas" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ user: { ...user.toObject(), passwordHash: undefined }, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// user actual
app.get("/users/me", authMiddleware, (req, res) => {
  res.json(req.user);
});

/* -------------------------------------------------------------
   ✏️ SELF-CRUD USUARIO
------------------------------------------------------------- */

// ✏️ SELF UPDATE: cualquier usuario edita SU propio perfil
app.put("/users/me", authMiddleware, async (req, res) => {
  try {
    const update = {};

    const allowed = [
      "firstName",
      "lastName",
      "phoneNumber",
      "avatarUrl",
      "birthDate",
      "isAvailable",  
      "expoPushToken"// 👈 AGREGADO
    ];

    // Copiar campos permitidos
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }

    // Solo oficiales pueden editar info policial
    if (req.user.role === "OFFICER") {
      if (req.body.policeRank != null) update.policeRank = req.body.policeRank;
      if (req.body.escalafon != null) update.escalafon = req.body.escalafon;
    }

    const user = await User.findByIdAndUpdate(req.user._id, update, {
      new: true,
      runValidators: true,
    }).select("-passwordHash");

    res.json(user);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🗑️ SELF DELETE: usuario elimina SU cuenta
app.delete("/users/me", authMiddleware, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user._id);
    await Location.deleteOne({ userId: req.user._id });
    res.json({ message: "Cuenta eliminada" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -------------------------------------------------------------
   📌 LISTADOS POR ROLES (solo para demo)
------------------------------------------------------------- */
app.get("/officers", async (req, res) => {
  const docs = await User.find({ role: "OFFICER" });
  res.json(docs);
});

app.get("/operators", async (req, res) => {
  const docs = await User.find({ role: "OPERATOR" });
  res.json(docs);
});

app.get("/civilians", async (req, res) => {
  const docs = await User.find({ role: "CIVIL" });
  res.json(docs);
});

/* -------------------------------------------------------------
   🛰️ LOCATION (el usuario manda su ubicación)
------------------------------------------------------------- */
app.put("/locations/me", authMiddleware, async (req, res) => {
  try {
    const { lon, lat, accuracyM, headingDeg, speedMps } = req.body;

    if (lon == null || lat == null) {
      return res.status(400).json({ error: "lon y lat requeridos" });
    }

    const doc = await Location.findOneAndUpdate(
      { userId: req.user._id },
      {
        $set: {
          coords: { type: "Point", coordinates: [parseFloat(lon), parseFloat(lat)] },
          accuracyM,
          headingDeg,
          speedMps,
          updatedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -------------------------------------------------------------
   🔍 NEARBY OFFICERS (CORREGIDO - sin fullName virtual)
------------------------------------------------------------- */
app.get("/nearby", async (req, res) => {
  try {
    const lon = parseFloat(req.query.lon);
    const lat = parseFloat(req.query.lat);
    const radius = parseInt(req.query.radius || 3000);
    const limit = parseInt(req.query.limit || 10);

    if (isNaN(lon) || isNaN(lat))
      return res.status(400).json({ error: "lon y lat query required" });

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
      { $match: { "user.role": "OFFICER" } },
      {
        $project: {
          userId: 1,
          coords: 1,
          updatedAt: 1,
          "user.firstName": 1,
          "user.lastName": 1,
          "user.phoneNumber": 1,
          "user.policeRank": 1,
          dist: 1,
        },
      },
      { $limit: limit },
    ]);

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -------------------------------------------------------------
   🚨 INCIDENTES
------------------------------------------------------------- */

// CIVIL crea emergencia
app.post("/incidents", authMiddleware, requireRole("CIVIL", "ADMIN"), async (req, res) => {
  try {
    const { emergencyTypeCode, lon, lat, details } = req.body;

    if (!emergencyTypeCode || lon == null || lat == null)
      return res.status(400).json({ error: "emergencyTypeCode, lon, lat required" });

    const allowedCodes = EMERGENCY_TYPES.map(e => e.code);
    if (!allowedCodes.includes(emergencyTypeCode)) {
      return res.status(400).json({
        error: "Tipo de emergencia inválido",
        allowed: allowedCodes
      });
    }

    const inc = await Incident.create({
      requesterId: req.user._id,
      emergencyTypeCode,
      initialLocation: {
        type: "Point",
        coordinates: [parseFloat(lon), parseFloat(lat)],
      },
      details,
    });

    res.status(201).json(inc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// OPERATOR/ADMIN asigna oficial
app.post(
  "/incidents/:id/assign",
  authMiddleware,
  requireRole("OPERATOR", "ADMIN"),
  async (req, res) => {
    try {
      const incidentId = req.params.id;
      const { officerId } = req.body;

      if (!officerId)
        return res.status(400).json({ error: "officerId required" });

      const inc = await Incident.findById(incidentId);
      if (!inc) return res.status(404).json({ error: "Incidente no existe" });

      inc.assignedOfficerId = officerId;
      inc.assignees.push({ officerId, assignedAt: new Date() });
      inc.status = "ASSIGNED";
      await inc.save();

      res.json(inc);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// OFFICER acepta
app.post(
  "/incidents/:id/accept",
  authMiddleware,
  requireRole("OFFICER"),
  async (req, res) => {
    try {
      const inc = await Incident.findById(req.params.id);
      if (!inc) return res.status(404).json({ error: "No existe incidente" });

      if (!inc.assignedOfficerId?.equals(req.user._id)) {
        return res.status(403).json({ error: "No estás asignado a este incidente" });
      }

      const lastAssign = inc.assignees
        .slice()
        .reverse()
        .find((a) => a.officerId.equals(req.user._id));

      if (lastAssign) lastAssign.acceptedAt = new Date();

      inc.status = "IN_PROGRESS";
      await inc.save();

      res.json(inc);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// OFFICER marca llegada
app.post(
  "/incidents/:id/arrive",
  authMiddleware,
  requireRole("OFFICER"),
  async (req, res) => {
    try {
      const inc = await Incident.findById(req.params.id);
      if (!inc) return res.status(404).json({ error: "No existe incidente" });

      if (!inc.assignedOfficerId?.equals(req.user._id)) {
        return res.status(403).json({ error: "No estás asignado a este incidente" });
      }

      const lastAssign = inc.assignees
        .slice()
        .reverse()
        .find(a => a.officerId.equals(req.user._id));

      if (lastAssign) lastAssign.arrivedAt = new Date();

      await inc.save();
      res.json(inc);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// OFFICER / OPERATOR / ADMIN resuelve
app.post(
  "/incidents/:id/resolve",
  authMiddleware,
  requireRole("OFFICER", "OPERATOR", "ADMIN"),
  async (req, res) => {
    try {
      const inc = await Incident.findById(req.params.id);
      if (!inc) return res.status(404).json({ error: "No existe incidente" });

      inc.status = "RESOLVED";

      const lastAssign = inc.assignees[inc.assignees.length - 1];
      if (lastAssign) lastAssign.closedAt = new Date();

      await inc.save();
      res.json(inc);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// CIVIL cancela
app.post(
  "/incidents/:id/cancel",
  authMiddleware,
  requireRole("CIVIL"),
  async (req, res) => {
    try {
      const inc = await Incident.findById(req.params.id);
      if (!inc) return res.status(404).json({ error: "No existe incidente" });

      if (!inc.requesterId.equals(req.user._id)) {
        return res.status(403).json({ error: "No puedes cancelar este incidente" });
      }

      inc.status = "CANCELLED";
      await inc.save();

      res.json(inc);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// listar incidentes (CORREGIDO - sin fullName virtual)
app.get(
  "/incidents",
  authMiddleware,
  requireRole("OPERATOR", "ADMIN", "OFFICER"),
  async (req, res) => {
    const docs = await Incident.find()
      .populate("requesterId", "firstName lastName phoneNumber")
      .populate("assignedOfficerId", "firstName lastName policeRank phoneNumber");
    res.json(docs);
  }
);

// ✅ Obtener incidente por ID (OPERATOR / ADMIN / OFFICER)
app.get(
  "/incidents/:id",
  authMiddleware,
  requireRole("OPERATOR", "ADMIN", "OFFICER"),
  async (req, res) => {
    try {
      const inc = await Incident.findById(req.params.id)
        .populate("requesterId", "firstName lastName phoneNumber")
        .populate("assignedOfficerId", "firstName lastName policeRank phoneNumber");

      if (!inc) return res.status(404).json({ error: "Incidente no encontrado" });

      res.json(inc);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);


/* -------------------------------------------------------------
   📍 TRACKING: devuelve ubicación del CIVIL y del OFFICER asignado
------------------------------------------------------------- */
app.get(
  "/incidents/:id/tracking",
  authMiddleware,
  requireRole("CIVIL", "OFFICER", "OPERATOR", "ADMIN"),
  async (req, res) => {
    try {
      const inc = await Incident.findById(req.params.id);
      if (!inc) return res.status(404).json({ error: "No existe incidente" });

      // última ubicación del civil
      const civilLoc = await Location.findOne({ userId: inc.requesterId });

      // última ubicación del oficial asignado actual
      let officerLoc = null;
      if (inc.assignedOfficerId) {
        officerLoc = await Location.findOne({ userId: inc.assignedOfficerId });
      }

      res.json({
        incidentId: inc._id,
        status: inc.status,
        emergencyTypeCode: inc.emergencyTypeCode,

        civil: {
          userId: inc.requesterId,
          location: civilLoc?.coords || null,
          updatedAt: civilLoc?.updatedAt || null,
        },

        officer: inc.assignedOfficerId
          ? {
              userId: inc.assignedOfficerId,
              location: officerLoc?.coords || null,
              updatedAt: officerLoc?.updatedAt || null,
            }
          : null,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/* -------------------------------------------------------------
   👑 ADMIN CRUD USUARIOS
------------------------------------------------------------- */

// Listar todos los usuarios
app.get("/admin/users", authMiddleware, requireRole("ADMIN"), async (req, res) => {
  const users = await User.find().select("-passwordHash");
  res.json(users);
});

// Ver un usuario específico
app.get("/admin/users/:id", authMiddleware, requireRole("ADMIN"), async (req, res) => {
  const user = await User.findById(req.params.id).select("-passwordHash");
  if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
  res.json(user);
});

// Crear usuario (admin)
app.post("/admin/users", authMiddleware, requireRole("ADMIN"), async (req, res) => {
  try {
    const { password, ...rest } = req.body;
    if (!password) return res.status(400).json({ error: "password requerido" });

    const u = new User({ ...rest, passwordHash: "temp" });
    await u.setPassword(password);
    await u.save();

    res.status(201).json({ ...u.toObject(), passwordHash: undefined });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Editar usuario (admin)
app.put("/admin/users/:id", authMiddleware, requireRole("ADMIN"), async (req, res) => {
  try {
    const update = { ...req.body };
    delete update.passwordHash;

    const user = await User.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true
    }).select("-passwordHash");

    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Eliminar usuario (admin)
app.delete("/admin/users/:id", authMiddleware, requireRole("ADMIN"), async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
  res.json({ message: "Usuario eliminado" });
});

/* -------------------------------------------------------------
   👑 ADMIN CRUD INCIDENTES
------------------------------------------------------------- */

// Editar cualquier incidente
app.put("/admin/incidents/:id", authMiddleware, requireRole("ADMIN"), async (req, res) => {
  try {
    const inc = await Incident.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!inc) return res.status(404).json({ error: "Incidente no encontrado" });
    res.json(inc);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Borrar cualquier incidente
app.delete("/admin/incidents/:id", authMiddleware, requireRole("ADMIN"), async (req, res) => {
  const inc = await Incident.findByIdAndDelete(req.params.id);
  if (!inc) return res.status(404).json({ error: "Incidente no encontrado" });
  res.json({ message: "Incidente eliminado" });
});

/* -------------------------------------------------------------
   HEALTH CHECK
------------------------------------------------------------- */
app.get("/", (req, res) => res.send("Police app running ✅"));

app.listen(PORT, () => console.log("Server listening on", PORT));