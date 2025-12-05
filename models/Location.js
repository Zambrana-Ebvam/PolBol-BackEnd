const mongoose = require("mongoose");
const { Schema } = mongoose;

const LocationSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  coords: {
    type: { type: String, enum: ["Point"], required: true, default: "Point" },
    coordinates: { type: [Number], required: true }, // [lon, lat]
  },
  accuracyM: { type: Number },
  headingDeg: { type: Number },
  speedMps: { type: Number },
  updatedAt: { type: Date, default: Date.now },
});

LocationSchema.index({ coords: "2dsphere" });
module.exports = mongoose.model("Location", LocationSchema);
