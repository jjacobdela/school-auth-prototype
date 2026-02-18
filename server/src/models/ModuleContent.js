const mongoose = require("mongoose");

const moduleContentSchema = new mongoose.Schema(
  {
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Module",
      required: true
    },
    type: String,
    title: String,
    fileUrl: String,
    textContent: String
  },
  { timestamps: true }
);

module.exports = mongoose.model("ModuleContent", moduleContentSchema);
