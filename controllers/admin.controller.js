const User = require("../models/User");
const Incident = require("../models/Incident");
const Location = require("../models/Location");

// Listar todos los usuarios
const listUsers = async (req, res, next) => {
  try {
    const users = await User.find().select("-passwordHash").sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    next(err);
  }
};

// Obtener un usuario por ID
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select("-passwordHash");
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    res.json(user);
  } catch (err) {
    next(err);
  }
};

// Crear usuario (Admin)
const createUser = async (req, res, next) => {
  try {
    const { password, ...userData } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ error: "La contraseña es obligatoria y debe tener al menos 6 caracteres" });
    }

    const newUser = new User({ ...userData, passwordHash: "temp" });
    await newUser.setPassword(password);
    await newUser.save();

    const userObj = newUser.toObject();
    delete userObj.passwordHash;

    res.status(201).json(userObj);
  } catch (err) {
    next(err);
  }
};

// Actualizar usuario (Admin)
const updateUser = async (req, res, next) => {
  try {
    const updateData = { ...req.body };
    delete updateData.passwordHash; // Evitar sobreescribir hash directamente

    // Si viene password plano, encriptarlo
    if (req.body.password) {
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
      await user.setPassword(req.body.password);
      delete updateData.password;
      updateData.passwordHash = user.passwordHash;
    }

    const updatedUser = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).select("-passwordHash");

    if (!updatedUser) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json(updatedUser);
  } catch (err) {
    next(err);
  }
};

// Eliminar usuario con eliminación en cascada de Location
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    await Location.deleteOne({ userId: req.params.id });

    res.json({ message: "Usuario y datos de ubicación eliminados exitosamente" });
  } catch (err) {
    next(err);
  }
};

// Actualizar cualquier incidente
const updateIncident = async (req, res, next) => {
  try {
    const incident = await Incident.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!incident) {
      return res.status(404).json({ error: "Incidente no encontrado" });
    }

    res.json(incident);
  } catch (err) {
    next(err);
  }
};

// Eliminar cualquier incidente
const deleteIncident = async (req, res, next) => {
  try {
    const incident = await Incident.findByIdAndDelete(req.params.id);
    if (!incident) {
      return res.status(404).json({ error: "Incidente no encontrado" });
    }

    res.json({ message: "Incidente eliminado exitosamente" });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  updateIncident,
  deleteIncident,
};
