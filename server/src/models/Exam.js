const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["multiple_choice", "true_false", "narrative"]
    },
    prompt: { type: String, required: true, trim: true },

    // multiple_choice fields
    choices: [{ type: String, trim: true }],
    correctIndex: { type: Number },

    // true_false fields
    correctBoolean: { type: Boolean },

    // narrative fields
    rubric: { type: String, trim: true }
  },
  { _id: false }
);

const examSchema = new mongoose.Schema(
  {
    examTitle: { type: String, required: true, trim: true, maxlength: 150 },
    department: { type: String, required: true, trim: true, maxlength: 80 },
    durationMinutes: { type: Number, required: true, min: 1 },

    status: { type: String, enum: ["draft", "published"], default: "draft" },

    questions: { type: [questionSchema], default: [] },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Exam", examSchema);
