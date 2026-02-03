const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },

    role: { type: String, enum: ["admin", "applicant"], default: "applicant" },
    status: { type: String, enum: ["Active", "Disabled"], default: "Active" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
