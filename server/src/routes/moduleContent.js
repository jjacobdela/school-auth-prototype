const express = require("express");
const multer = require("multer");
const ModuleContent = require("../models/ModuleContent");
const { requireAuth } = require("../middleware/auth");

const upload = multer({ dest: "uploads/" });
const router = express.Router();

router.post(
  "/upload",
  requireAuth,
  upload.single("file"),
  async (req, res) => {
    const content = await ModuleContent.create({
      moduleId: req.body.moduleId,
      type: req.body.type,
      fileUrl: req.file.path
    });

    res.json({ content });
  }
);

router.post("/text", requireAuth, async (req, res) => {
  const content = await ModuleContent.create(req.body);
  res.json({ content });
});

module.exports = router;
