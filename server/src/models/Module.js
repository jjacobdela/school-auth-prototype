const mongoose = require("mongoose");

const PageSchema = new mongoose.Schema({
  title: {
    type: String,
  },
  type: {
    type: String,
    enum: ["text", "video", "pdf"],
  },
  content: {
    text: String,
    url: String
  }
}, { _id: false });

const ModuleSchema = new mongoose.Schema({
  title: {
    type: String,
  },
  description: {
    type: String,
    default: ""
  },
  pages: {
    type: [PageSchema],
    default: []
  },
  status: {
  type: String,
  enum: ["draft", "published"],
  default: "draft"
},
createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }

}, {
  timestamps: true
});



module.exports = mongoose.model("Module", ModuleSchema);
