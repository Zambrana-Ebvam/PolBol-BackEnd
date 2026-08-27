const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { POLICE_RANKS, USER_ROLES } = require("../constants/emergencyTypes");
const { Schema } = mongoose;

// Formato de escalafón: 3 letras + 4 números (ej: ABC1234)
const ESCALAFON_REGEX = /^[A-Z]{3}\d{4}$/;

const UserSchema = new Schema(
  {
    email: {
      type: String,
      required: [true, "El email es obligatorio"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Email inválido"],
    },

    passwordHash: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      required: [true, "El rol es obligatorio"],
    },

    // Datos generales de usuario
    firstName: { type: String, required: [true, "El nombre es obligatorio"], trim: true },
    lastName: { type: String, required: [true, "El apellido es obligatorio"], trim: true },
    phoneNumber: { type: String, required: [true, "El número de teléfono es obligatorio"], trim: true },
    ci: { type: String, required: [true, "El carnet de identidad (CI) es obligatorio"], trim: true, unique: true },
    birthDate: { type: Date, required: [true, "La fecha de nacimiento es obligatoria"] },

    avatarUrl: { type: String, default: null },

    // Token para notificaciones Push (Expo)
    expoPushToken: { type: String, default: null },

    // Datos exclusivos para Oficiales de policía
    policeRank: {
      type: String,
      enum: POLICE_RANKS,
      required: function () {
        return this.role === USER_ROLES.OFFICER;
      },
    },

    escalafon: {
      type: String,
      uppercase: true,
      trim: true,
      validate: {
        validator: function (v) {
          if (this.role !== USER_ROLES.OFFICER) return true;
          return ESCALAFON_REGEX.test(v || "");
        },
        message: "Escalafón inválido. Formato requerido: 3 letras + 4 números (ej: ABC1234).",
      },
      required: function () {
        return this.role === USER_ROLES.OFFICER;
      },
      unique: true,
      sparse: true,
    },

    isAvailable: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Índices para optimización de consultas
UserSchema.index({ role: 1 });
UserSchema.index({ isAvailable: 1 });

// Virtual para nombre completo
UserSchema.virtual("fullName").get(function () {
  return `${this.firstName || ""} ${this.lastName || ""}`.trim();
});

// Encriptación y verificación de contraseña
UserSchema.methods.setPassword = async function (plainPassword) {
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(plainPassword, salt);
};

UserSchema.methods.checkPassword = function (plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

module.exports = mongoose.model("User", UserSchema);