const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  location: String,
  isInstructor: { type: Boolean, default: false },
  classesAttended: { type: Number, default: 0 },
  absenceCount: { type: Number, default: 0 },
  reservations: [{ type: mongoose.Schema.Types.ObjectId, ref: "Class" }],
  waitLists: [{ type: mongoose.Schema.Types.ObjectId, ref: "Class" }],
  verified: { type: Boolean, default: false },
  paid: { type: Boolean, default: false },
  totalReservations: [{ type: mongoose.Schema.Types.ObjectId, ref: "Class" }],
});

const userModel = mongoose.model("User", userSchema);

module.exports = userModel;
