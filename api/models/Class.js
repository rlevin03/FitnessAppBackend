const mongoose = require("mongoose");
const { Schema } = mongoose;

const ClassSchema = new Schema(
  {
    name: { type: String, required: true },
    date: { type: Date, required: true },
    paymentRequired: { type: Boolean, default: false },
    type: { type: String, required: true },
    campus: { type: String, required: true },
    duration: { type: Number, required: true },
    location: { type: String, required: true },
    substitute: { type: Boolean, default: false },
    maxCapacity: { type: Number, required: true },
    minCapacity: { type: Number, required: true },
    waitListCapacity: { type: Number, default: 0 },
    description: { type: String, required: true },
    skillLevel: { type: String, required: true },
    intensityLevel: { type: String, required: true },
    equipmentToBring: [String],
    attendanceTaken: { type: Boolean, default: false },
    instructor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    usersSignedUp: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    usersOnWaitList: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    totalSignUps: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  {
    timestamps: true,
  }
);

const ClassModel = mongoose.model("Class", ClassSchema);

module.exports = ClassModel;
