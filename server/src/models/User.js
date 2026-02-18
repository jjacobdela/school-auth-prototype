const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["admin", "applicant"], default: "applicant" },

  assignedModules: [{ type: mongoose.Schema.Types.ObjectId, ref: "Module" }]
}, { timestamps: true });


allowedModules: [{
  type: mongoose.Schema.Types.ObjectId,
  ref: "Module"
}]


module.exports = mongoose.model("User", userSchema);
