const mongoose = require("mongoose");
const { INCIDENT_STATUS } = require("../constants/emergencyTypes");
const { Schema } = mongoose;

const TimelineEventSchema = new Schema(
  {
    status: {
      type: String,
      enum: Object.values(INCIDENT_STATUS),
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    note: {
      type: String,
      default: "",
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const AssigneeSchema = new Schema(
  {
    officerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedAt: { type: Date, default: Date.now },
    acceptedAt: { type: Date, default: null },
    arrivedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
  },
  { _id: false }
);

const IncidentSchema = new Schema(
  {
    requesterId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "El solicitante (requesterId) es obligatorio"],
    },

    emergencyTypeCode: {
      type: String,
      required: [true, "El tipo de emergencia es obligatorio"],
    },

    initialLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitud, latitud]
        required: [true, "Las coordenadas iniciales son obligatorias"],
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
        default: undefined,
      },
    },

    details: {
      type: Schema.Types.Mixed,
      default: {},
    },

    priority: {
      type: Number,
      default: 1,
      min: 1,
      max: 5,
    },

    status: {
      type: String,
      enum: Object.values(INCIDENT_STATUS),
      default: INCIDENT_STATUS.OPEN,
    },

    assignedOfficerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    assignees: {
      type: [AssigneeSchema],
      default: [],
    },

    timeline: {
      type: [TimelineEventSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Índices para optimizar consultas de incidentes
IncidentSchema.index({ initialLocation: "2dsphere" });
IncidentSchema.index({ status: 1 });
IncidentSchema.index({ requesterId: 1 });
IncidentSchema.index({ assignedOfficerId: 1 });
IncidentSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Incident", IncidentSchema);