const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Location = require("../models/Location");
const { USER_ROLES } = require("../constants/emergencyTypes");

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// Registro de usuarios (CIVIL u OFFICER)
const register = async (req, res, next) => {
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
      escalafon,
      expoPushToken,
    } = req.body;

    // Validación básica de campos requeridos
    if (!email || !firstName || !lastName || !phoneNumber || !ci || !birthDate || !role || !password) {
      return res.status(400).json({
        error: "Los campos email, firstName, lastName, phoneNumber, ci, birthDate, role y password son obligatorios.",
      });
    }

    // Auto-registro solo para CIVIL y OFFICER
    const selfRegisterRoles = [USER_ROLES.CIVIL, USER_ROLES.OFFICER];
    if (!selfRegisterRoles.includes(role)) {
      return res.status(403).json({
        error: "Desde la aplicación solo está permitido el registro de roles CIVIL y OFFICER.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres." });
    }

    // Validaciones específicas para OFFICER
    if (role === USER_ROLES.OFFICER) {
      if (!policeRank || !escalafon) {
        return res.status(400).json({
          error: "Para el rol OFFICER es obligatorio especificar 'policeRank' y 'escalafon'.",
        });
      }
    }

    // Comprobaciones preventivas de duplicados antes de guardar
    const existingEmail = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingEmail) {
      return res.status(409).json({ error: "El correo electrónico ya está registrado." });
    }

    const existingCI = await User.findOne({ ci: ci.trim() });
    if (existingCI) {
      return res.status(409).json({ error: "El número de carnet de identidad (CI) ya está registrado." });
    }

    if (escalafon) {
      const existingEscalafon = await User.findOne({ escalafon: escalafon.toUpperCase().trim() });
      if (existingEscalafon) {
        return res.status(409).json({ error: "El código de escalafón policial ya está registrado." });
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
      policeRank: role === USER_ROLES.OFFICER ? policeRank : undefined,
      escalafon: role === USER_ROLES.OFFICER ? escalafon : undefined,
      expoPushToken: expoPushToken || null,
    });

    await user.setPassword(password);
    await user.save();

    const token = generateToken(user);
    const userObj = user.toObject();
    delete userObj.passwordHash;

    res.status(201).json({
      message: "Usuario registrado exitosamente",
      user: userObj,
      token,
    });
  } catch (err) {
    next(err);
  }
};

// Login de usuarios
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email y contraseña requeridos" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const isMatch = await user.checkPassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const token = generateToken(user);
    const userObj = user.toObject();
    delete userObj.passwordHash;

    res.json({
      message: "Inicio de sesión exitoso",
      user: userObj,
      token,
    });
  } catch (err) {
    next(err);
  }
};

// Obtener perfil del usuario autenticado
const getMe = async (req, res) => {
  res.json(req.user);
};

// Actualizar perfil del usuario autenticado
const updateMe = async (req, res, next) => {
  try {
    const update = {};
    const allowedFields = [
      "firstName",
      "lastName",
      "phoneNumber",
      "avatarUrl",
      "birthDate",
      "isAvailable",
      "expoPushToken",
    ];

    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        update[key] = req.body[key];
      }
    }

    if (req.user.role === USER_ROLES.OFFICER) {
      if (req.body.policeRank !== undefined) update.policeRank = req.body.policeRank;
      if (req.body.escalafon !== undefined) update.escalafon = req.body.escalafon;
    }

    const user = await User.findByIdAndUpdate(req.user._id, update, {
      new: true,
      runValidators: true,
    }).select("-passwordHash");

    res.json(user);
  } catch (err) {
    next(err);
  }
};

// Eliminar propia cuenta con borrado en cascada
const deleteMe = async (req, res, next) => {
  try {
    const userId = req.user._id;
    await User.findByIdAndDelete(userId);
    await Location.deleteOne({ userId: userId });

    res.json({ message: "Cuenta y datos de ubicación eliminados exitosamente" });
  } catch (err) {
    next(err);
  }
};

// Listar oficiales (filtrando campos sensibles)
const getOfficers = async (req, res, next) => {
  try {
    const officers = await User.find({ role: USER_ROLES.OFFICER }).select("-passwordHash");
    res.json(officers);
  } catch (err) {
    next(err);
  }
};

// Listar operadores (filtrando campos sensibles)
const getOperators = async (req, res, next) => {
  try {
    const operators = await User.find({ role: USER_ROLES.OPERATOR }).select("-passwordHash");
    res.json(operators);
  } catch (err) {
    next(err);
  }
};

// Listar civiles (filtrando campos sensibles)
const getCivilians = async (req, res, next) => {
  try {
    const civilians = await User.find({ role: USER_ROLES.CIVIL }).select("-passwordHash");
    res.json(civilians);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateMe,
  deleteMe,
  getOfficers,
  getOperators,
  getCivilians,
};
