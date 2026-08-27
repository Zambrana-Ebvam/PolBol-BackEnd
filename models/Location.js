const mongoose = require("mongoose");
const { Schema } = mongoose;

const LocationSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: [true, "userId es obligatorio"],
    unique: true,
  },
  coords: {
    type: {
      type: String,
      enum: ["Point"],
      required: true,
      default: "Point",
    },
    coordinates: {
      type: [Number], // [longitud, latitud]
      required: [true, "Coordenadas requeridas [longitud, latitud]"],
    },
  },
  accuracyM: { type: Number, default: null },
  headingDeg: { type: Number, default: null },
  speedMps: { type: Number, default: null },
  updatedAt: { type: Date, default: Date.now },
});

LocationSchema.index({ coords: "2dsphere" });

module.exports = mongoose.model("Location", LocationSchema);
