const mongoose = require("mongoose");
const { Schema } = mongoose;

const IncidentSchema = new Schema(
  {
    requesterId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    emergencyTypeCode: { type: String, required: true },

    initialLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },

    currentLocation: {
      _id: false,
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: {
        type: [Number],
        default: undefined 
      },
    },

    details: { type: Schema.Types.Mixed },

    priority: { type: Number, default: 1 },

    status: {
      type: String,
      enum: ["OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CANCELLED"],
      default: "OPEN",
    },

    assignedOfficerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // ✅ CORRECCIÓN AQUÍ: _id: false para que el populate funcione perfecto
    assignees: [
      {
        _id: false, 
        officerId: {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
        assignedAt: { type: Date, default: Date.now },
        acceptedAt: { type: Date },
        arrivedAt: { type: Date },
        closedAt: { type: Date },
      },
    ],

    timeline: {
      type: Array,
      default: [],
    },
  },
  { timestamps: true }
);

IncidentSchema.index({ initialLocation: "2dsphere" });

module.exports = mongoose.model("Incident", IncidentSchema);