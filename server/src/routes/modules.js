const express = require("express");
const mongoose = require("mongoose");
const Module = require("../models/Module");
const Exam = require("../models/Exam");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeItemType(type) {
  if (type === "video" || type === "pdf" || type === "text") {
    return type;
  }
  return "text";
}

function normalizeItem(item = {}, itemIndex = 0) {
  const type = normalizeItemType(item.type);
  return {
    title: normalizeText(item.title) || `Resource ${itemIndex + 1}`,
    type,
    content:
      type === "text"
        ? { text: normalizeText(item.content?.text), url: "" }
        : { text: "", url: normalizeText(item.content?.url) }
  };
}

function normalizeLesson(lesson = {}, lessonIndex = 0) {
  const items = Array.isArray(lesson.items) ? lesson.items.map((item, index) => normalizeItem(item, index)) : [];

  return {
    title: normalizeText(lesson.title) || `Lesson ${lessonIndex + 1}`,
    summary: normalizeText(lesson.summary),
    items
  };
}

function legacyPagesToLessons(pages = []) {
  if (!Array.isArray(pages)) return [];

  return pages.map((page, index) => {
    const type = normalizeItemType(page?.type);
    return {
      title: normalizeText(page?.title) || `Lesson ${index + 1}`,
      summary: "",
      items: [
        {
          title: normalizeText(page?.title) || `Resource ${index + 1}`,
          type,
          content:
            type === "text"
              ? { text: normalizeText(page?.content?.text), url: "" }
              : { text: "", url: normalizeText(page?.content?.url) }
        }
      ]
    };
  });
}

function resolveLessons(body = {}) {
  if (Array.isArray(body.lessons)) {
    return body.lessons.map((lesson, index) => normalizeLesson(lesson, index));
  }

  if (Array.isArray(body.pages)) {
    return legacyPagesToLessons(body.pages);
  }

  return [];
}

function flattenLessonsToPages(lessons = []) {
  const pages = [];

  for (const lesson of lessons) {
    for (const item of lesson.items || []) {
      pages.push({
        title: normalizeText(item.title) || normalizeText(lesson.title),
        type: normalizeItemType(item.type),
        content:
          item.type === "text"
            ? { text: normalizeText(item.content?.text), url: "" }
            : { text: "", url: normalizeText(item.content?.url) }
      });
    }
  }

  return pages;
}

function countResources(lessons = []) {
  return lessons.reduce((sum, lesson) => sum + (lesson.items || []).length, 0);
}

function validateLessonsForPublish(lessons = []) {
  if (!Array.isArray(lessons) || lessons.length === 0) {
    return "Add at least 1 lesson to publish.";
  }

  for (let lessonIndex = 0; lessonIndex < lessons.length; lessonIndex += 1) {
    const lesson = lessons[lessonIndex];
    if (!normalizeText(lesson.title)) {
      return `Lesson ${lessonIndex + 1}: title is required.`;
    }

    if (!Array.isArray(lesson.items) || lesson.items.length === 0) {
      return `Lesson ${lessonIndex + 1}: add at least 1 learning item.`;
    }

    for (let itemIndex = 0; itemIndex < lesson.items.length; itemIndex += 1) {
      const item = lesson.items[itemIndex];

      if (!normalizeText(item.title)) {
        return `Lesson ${lessonIndex + 1}, item ${itemIndex + 1}: title is required.`;
      }

      if (!["text", "video", "pdf"].includes(item.type)) {
        return `Lesson ${lessonIndex + 1}, item ${itemIndex + 1}: invalid type.`;
      }

      if (item.type === "text" && !normalizeText(item.content?.text)) {
        return `Lesson ${lessonIndex + 1}, item ${itemIndex + 1}: text content is required.`;
      }

      if (item.type !== "text" && !normalizeText(item.content?.url)) {
        return `Lesson ${lessonIndex + 1}, item ${itemIndex + 1}: resource URL is required.`;
      }
    }
  }

  return null;
}

async function resolveFinalExam(finalExamId, userId, { requirePublished = false, required = false, moduleId = null } = {}) {
  if (!finalExamId) {
    if (required) {
      return { error: "Link a final exam before publishing." };
    }
    return { exam: null };
  }

  if (!mongoose.isValidObjectId(finalExamId)) {
    return { error: "Invalid final exam id." };
  }

  const exam = await Exam.findOne({ _id: finalExamId, createdBy: userId }).select("_id examTitle status linkedModuleId");
  if (!exam) {
    return { error: "Final exam not found." };
  }

  if (requirePublished && exam.status !== "published") {
    return { error: "Final exam must be published before the module can be published." };
  }

  if (exam.linkedModuleId && String(exam.linkedModuleId) !== String(moduleId || "")) {
    return { error: "Final exam is already linked to another module." };
  }

  return { exam };
}

function serializeModule(moduleDoc) {
  const module = moduleDoc.toObject({ virtuals: false });
  const lessons = Array.isArray(module.lessons) && module.lessons.length > 0 ? module.lessons : legacyPagesToLessons(module.pages || []);
  const resourcesCount = countResources(lessons);
  const finalExam = module.finalExamId && typeof module.finalExamId === "object"
    ? {
        _id: module.finalExamId._id,
        examTitle: module.finalExamId.examTitle,
        status: module.finalExamId.status
      }
    : null;

  return {
    ...module,
    lessons,
    lessonsCount: lessons.length,
    resourcesCount,
    pagesCount: resourcesCount,
    finalExamId: finalExam ? finalExam._id : module.finalExamId || null,
    finalExam
  };
}

async function syncExamModuleLink({ moduleId, userId, previousExamId = null, nextExamId = null }) {
  if (previousExamId && String(previousExamId) !== String(nextExamId || "")) {
    await Exam.findOneAndUpdate(
      { _id: previousExamId, createdBy: userId, linkedModuleId: moduleId },
      { $set: { linkedModuleId: null } }
    );
  }

  if (nextExamId) {
    await Exam.findOneAndUpdate(
      { _id: nextExamId, createdBy: userId },
      { $set: { linkedModuleId: moduleId } }
    );
  }
}

router.post("/", requireAuth, async (req, res) => {
  try {
    const { title, description, status, finalExamId } = req.body || {};
    const lessons = resolveLessons(req.body || {});
    const nextStatus = status === "published" ? "published" : "draft";

    if (nextStatus === "published") {
      if (!normalizeText(title)) {
        return res.status(400).json({ message: "Title is required to publish." });
      }

      const lessonError = validateLessonsForPublish(lessons);
      if (lessonError) {
        return res.status(400).json({ message: lessonError });
      }
    }

    const finalExamResult = await resolveFinalExam(finalExamId, req.user.userId, {
      required: nextStatus === "published",
      requirePublished: nextStatus === "published"
    });

    if (finalExamResult.error) {
      return res.status(400).json({ message: finalExamResult.error });
    }

    const module = await Module.create({
      title: normalizeText(title),
      description: normalizeText(description),
      lessons,
      pages: flattenLessonsToPages(lessons),
      status: nextStatus,
      finalExamId: finalExamResult.exam?._id || null,
      createdBy: req.user.userId
    });

    await syncExamModuleLink({
      moduleId: module._id,
      userId: req.user.userId,
      nextExamId: finalExamResult.exam?._id || null
    });

    const populatedModule = await Module.findById(module._id).populate("finalExamId", "_id examTitle status");
    return res.status(201).json(serializeModule(populatedModule));
  } catch (err) {
    console.error("CREATE MODULE ERROR:", err);
    return res.status(400).json({
      message: err.message,
      errors: err.errors || null
    });
  }
});

router.get("/", requireAuth, async (req, res) => {
  try {
    const modules = await Module.find()
      .populate("finalExamId", "_id examTitle status")
      .sort({ createdAt: -1 });

    res.json(modules.map((module) => serializeModule(module)));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const module = await Module.findById(req.params.id).populate("finalExamId", "_id examTitle status");
    if (!module) return res.status(404).json({ message: "Module not found" });
    res.json(serializeModule(module));
  } catch (err) {
    res.status(400).json({ message: "Invalid module ID" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const { title, description, status, finalExamId } = req.body || {};
    const lessons = resolveLessons(req.body || {});
    const nextStatus = status === "published" ? "published" : "draft";
    const existingModule = await Module.findById(req.params.id).select("_id finalExamId");

    if (!existingModule) {
      return res.status(404).json({ message: "Module not found" });
    }

    if (nextStatus === "published") {
      if (!normalizeText(title)) {
        return res.status(400).json({ message: "Title is required to publish." });
      }

      const lessonError = validateLessonsForPublish(lessons);
      if (lessonError) {
        return res.status(400).json({ message: lessonError });
      }
    }

    const finalExamResult = await resolveFinalExam(finalExamId, req.user.userId, {
      required: nextStatus === "published",
      requirePublished: nextStatus === "published",
      moduleId: existingModule._id
    });

    if (finalExamResult.error) {
      return res.status(400).json({ message: finalExamResult.error });
    }

    const module = await Module.findByIdAndUpdate(
      existingModule._id,
      {
        title: normalizeText(title),
        description: normalizeText(description),
        lessons,
        pages: flattenLessonsToPages(lessons),
        status: nextStatus,
        finalExamId: finalExamResult.exam?._id || null
      },
      { new: true, runValidators: true }
    ).populate("finalExamId", "_id examTitle status");

    await syncExamModuleLink({
      moduleId: existingModule._id,
      userId: req.user.userId,
      previousExamId: existingModule.finalExamId || null,
      nextExamId: finalExamResult.exam?._id || null
    });

    res.json(serializeModule(module));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    await Module.findByIdAndDelete(req.params.id);
    res.json({ message: "Module deleted" });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
