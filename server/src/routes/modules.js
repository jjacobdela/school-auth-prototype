const express = require("express");
const router = express.Router();
const Module = require("../models/Module");
const { requireAuth } = require("../middleware/auth");

/*
  Module body expected:
  {
    title,
    description,
    status: "draft" | "published",
    pages: [
      {
        title,
        type: "video" | "pdf" | "text",
        content: { url?, text? }
      }
    ]
  }
*/

// ✅ CREATE MODULE (Draft allowed, Publish validated)
router.post("/", requireAuth, async (req, res) => {
  try {
    const { title, description, pages, status } = req.body;

    const nextStatus = status === "published" ? "published" : "draft";

    // ✅ Only enforce strict requirements if publishing
    if (nextStatus === "published") {
      if (!title || !title.trim()) {
        return res.status(400).json({ message: "Title is required to publish." });
      }

      if (!Array.isArray(pages) || pages.length === 0) {
        return res.status(400).json({ message: "Add at least 1 page to publish." });
      }

      for (let i = 0; i < pages.length; i++) {
        const p = pages[i];

        if (!p?.title || !p.title.trim()) {
          return res.status(400).json({ message: `Page ${i + 1}: title is required.` });
        }

        if (!p?.type || !["text", "video", "pdf"].includes(p.type)) {
          return res.status(400).json({ message: `Page ${i + 1}: invalid type.` });
        }

        if (p.type === "text") {
          if (!p?.content?.text || !p.content.text.trim()) {
            return res.status(400).json({ message: `Page ${i + 1}: text content is required.` });
          }
        } else {
          if (!p?.content?.url) {
            return res.status(400).json({ message: `Page ${i + 1}: upload required.` });
          }
        }
      }
    }

    const module = await Module.create({
      title: title || "",
      description: description || "",
      pages: Array.isArray(pages) ? pages : [],
      status: nextStatus,
      createdBy: req.user.userId
    });

    console.log("REQ.USER:", req.user);


    

    return res.status(201).json(module);
  } catch (err) {
    console.error("CREATE MODULE ERROR:", err);
    return res.status(400).json({
      message: err.message,
      errors: err.errors || null
    });
  }
});

// ✅ GET ALL MODULES (LIST VIEW)
router.get("/", requireAuth, async (req, res) => {
  try {
    const modules = await Module.find()
      .select("title description pages status createdAt")
      .sort({ createdAt: -1 });

    res.json(
      modules.map((m) => ({
        _id: m._id,
        title: m.title,
        description: m.description,
        status: m.status || "draft",
        pagesCount: (m.pages || []).length,
        createdAt: m.createdAt
        
      }))
    );
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ GET SINGLE MODULE (VIEW + EDIT)
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const module = await Module.findById(req.params.id);
    if (!module) return res.status(404).json({ message: "Module not found" });
    res.json(module);
  } catch (err) {
    res.status(400).json({ message: "Invalid module ID" });
  }
});

// ✅ UPDATE MODULE
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const { title, description, pages, status } = req.body;

    const nextStatus = status === "published" ? "published" : "draft";

    const module = await Module.findByIdAndUpdate(
      req.params.id,
      {
        title,
        description,
        pages,
        status: nextStatus
      },
      { new: true, runValidators: true }
    );

    if (!module) return res.status(404).json({ message: "Module not found" });
    res.json(module);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ✅ DELETE MODULE
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    await Module.findByIdAndDelete(req.params.id);
    res.json({ message: "Module deleted" });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
