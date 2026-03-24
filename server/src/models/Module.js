const mongoose = require("mongoose");

const LearningItemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: ""
    },
    type: {
      type: String,
      enum: ["text", "video", "pdf"]
    },
    content: {
      text: String,
      url: String
    }
  },
  { _id: false }
);

const LessonSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: ""
    },
    summary: {
      type: String,
      default: ""
    },
    items: {
      type: [LearningItemSchema],
      default: []
    }
  },
  { _id: false }
);

const PageSchema = new mongoose.Schema({
  title: {
    type: String
  },
  type: {
    type: String,
    enum: ["text", "video", "pdf"]
  },
  content: {
    text: String,
    url: String
  }
}, { _id: false });

const ModuleSchema = new mongoose.Schema({
  title: {
    type: String
  },
  description: {
    type: String,
    default: ""
  },
  lessons: {
    type: [LessonSchema],
    default: []
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
    ref: "User"
  },
  finalExamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Exam",
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("Module", ModuleSchema);
