const express = require("express");
const mongoose = require("mongoose");
const Exam = require("../models/Exam");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function validateQuestions(questions) {
  if (!Array.isArray(questions)) return "questions must be an array";

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q || typeof q !== "object") return `question ${i + 1} is invalid`;

    if (!isNonEmptyString(q.type)) return `question ${i + 1}: type is required`;
    if (!isNonEmptyString(q.prompt)) return `question ${i + 1}: prompt is required`;

    if (q.type === "multiple_choice") {
      if (!Array.isArray(q.choices)) return `question ${i + 1}: choices must be an array`;
      const filled = q.choices.filter((c) => isNonEmptyString(c));
      if (filled.length < 2) return `question ${i + 1}: at least 2 non-empty choices required`;

      if (typeof q.correctIndex !== "number") return `question ${i + 1}: correctIndex must be a number`;
      if (q.correctIndex < 0 || q.correctIndex >= q.choices.length)
        return `question ${i + 1}: correctIndex out of range`;

      if (!isNonEmptyString(q.choices[q.correctIndex]))
        return `question ${i + 1}: correct choice cannot be empty`;
    }

    if (q.type === "true_false") {
      if (typeof q.correctBoolean !== "boolean")
        return `question ${i + 1}: correctBoolean must be true/false`;
    }

    if (q.type === "narrative") {
      if (!isNonEmptyString(q.rubric)) return `question ${i + 1}: rubric is required`;
    }

    if (!["multiple_choice", "true_false", "narrative"].includes(q.type)) {
      return `question ${i + 1}: unsupported type`;
    }
  }

  return null;
}

/**
 * POST /api/exams
 * body: { examTitle, department, durationMinutes, status?, questions? }
 */
router.post("/", requireAuth, async (req, res) => {
  try {
    const { examTitle, department, durationMinutes, status, questions } = req.body || {};

    if (!isNonEmptyString(examTitle)) {
      return res.status(400).json({ message: "examTitle is required" });
    }
    if (!isNonEmptyString(department)) {
      return res.status(400).json({ message: "department is required" });
    }
    const dur = Number(durationMinutes);
    if (!Number.isFinite(dur) || dur <= 0) {
      return res.status(400).json({ message: "durationMinutes must be a positive number" });
    }

    const examStatus = status === "published" ? "published" : "draft";

    const qErr = validateQuestions(questions || []);
    if (qErr) return res.status(400).json({ message: qErr });

    const exam = await Exam.create({
      examTitle: examTitle.trim(),
      department: department.trim(),
      durationMinutes: dur,
      status: examStatus,
      questions: questions || [],
      createdBy: req.user.userId
    });

    return res.status(201).json({ exam });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET /api/exams?department=&status=
 */
router.get("/", requireAuth, async (req, res) => {
  try {
    const { department, status } = req.query || {};

    const filter = { createdBy: req.user.userId };
    if (isNonEmptyString(department)) filter.department = department.trim();
    if (status === "draft" || status === "published") filter.status = status;

    const exams = await Exam.find(filter)
      .sort({ updatedAt: -1 })
      .select("_id examTitle department durationMinutes status createdAt updatedAt");

    return res.json({ exams });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET /api/exams/:id
 */
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid exam id" });
    }

    const exam = await Exam.findOne({ _id: id, createdBy: req.user.userId });
    if (!exam) return res.status(404).json({ message: "Exam not found" });

    return res.json({ exam });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * PUT /api/exams/:id
 * body: { examTitle, department, durationMinutes, status, questions }
 */
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid exam id" });
    }

    const { examTitle, department, durationMinutes, status, questions } = req.body || {};

    const update = {};

    if (examTitle !== undefined) {
      if (!isNonEmptyString(examTitle)) return res.status(400).json({ message: "examTitle cannot be empty" });
      update.examTitle = examTitle.trim();
    }

    if (department !== undefined) {
      if (!isNonEmptyString(department)) return res.status(400).json({ message: "department cannot be empty" });
      update.department = department.trim();
    }

    if (durationMinutes !== undefined) {
      const dur = Number(durationMinutes);
      if (!Number.isFinite(dur) || dur <= 0) {
        return res.status(400).json({ message: "durationMinutes must be a positive number" });
      }
      update.durationMinutes = dur;
    }

    if (status !== undefined) {
      if (status !== "draft" && status !== "published") {
        return res.status(400).json({ message: "status must be draft or published" });
      }
      update.status = status;
    }

    if (questions !== undefined) {
      const qErr = validateQuestions(questions);
      if (qErr) return res.status(400).json({ message: qErr });
      update.questions = questions;
    }

    const exam = await Exam.findOneAndUpdate(
      { _id: id, createdBy: req.user.userId },
      { $set: update },
      { new: true }
    );

    if (!exam) return res.status(404).json({ message: "Exam not found" });

    return res.json({ exam });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * DELETE /api/exams/:id
 */
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid exam id" });
    }

    const deleted = await Exam.findOneAndDelete({ _id: id, createdBy: req.user.userId });
    if (!deleted) return res.status(404).json({ message: "Exam not found" });

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
