const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { Schema } = mongoose;

const POLICE_RANKS = [
  "GACIP - Voluntario",
  "ALUMNO",
  "SARGENTO",
  "SARGENTO_SEGUNDO",
  "SARGENTO_PRIMERO",
  "SARGENTO_MAYOR",
  "SUBOFICIAL_SEGUNDO",
  "SUBOFICIAL_PRIMERO",
  "SUBOFICIAL_MAYOR",
  "SUBOFICIAL_SUPERIOR",
  "CADETE",
  "SUBTENIENTE",
  "TENIENTE",
  "CAPITAN",
  "MAYOR",
  "TENIENTE_CORONEL",
  "CORONEL",
  "GENERAL_PRIMERO",
  "GENERAL_MAYOR",
  "GENERAL_SUPERIOR",
];

// 3 letras + 4 numeros => ABC1234
const ESCALAFON_REGEX = /^[A-Z]{3}\d{4}$/;

const UserSchema = new Schema(
  {
    // ✅ EMAIL OBLIGATORIO Y ÚNICO
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Email inválido"]
    },

    passwordHash: { type: String, required: true },

    role: {
      type: String,
      enum: ["CIVIL", "OFFICER", "OPERATOR", "ADMIN"],
      required: true,
    },

    // ✅ Datos para TODOS
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phoneNumber: { type: String, required: true, trim: true },
    ci: { type: String, required: true, trim: true, unique: true }, // carnet identidad
    birthDate: { type: Date, required: true },

    avatarUrl: { type: String },

    // 👇 NUEVO: Token para notificaciones Push (Expo)
    expoPushToken: { type: String },

    // ✅ Solo oficiales
    policeRank: {
      type: String,
      enum: POLICE_RANKS,
      required: function () {
        return this.role === "OFFICER";
      },
    },

    escalafon: {
      type: String,
      uppercase: true,
      trim: true,
      validate: {
        validator: function (v) {
          if (this.role !== "OFFICER") return true; // no aplica a civil
          return ESCALAFON_REGEX.test(v || "");
        },
        message: "Escalafón inválido. Formato requerido: 3 letras + 4 números (ej: ABC1234).",
      },
      required: function () {
        return this.role === "OFFICER";
      },
      unique: true,
      sparse: true,
    },

    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// helper: nombre completo virtual
UserSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`.trim();
});

UserSchema.methods.setPassword = async function (plain) {
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(plain, salt);
};

UserSchema.methods.checkPassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

module.exports = mongoose.model("User", UserSchema);