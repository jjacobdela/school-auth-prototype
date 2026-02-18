const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const TrainingRequest = require("../models/TrainingRequest");
const Module = require("../models/Module");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");
const nodemailer = require("nodemailer");
const { sendTrainingInviteEmail } = require("../utils/mailer");
 // whatever your path is

router.post("/", requireAuth, async (req, res) => {
  try {
    const { moduleId, justification, fullName, email } = req.body;

    console.log("REQ.BODY:", req.body); // debug

    if (!email || !String(email).trim()) {
      return res.status(400).json({ message: "email is required" });
    }

    const moduleExists = await Module.findById(moduleId);
    if (!moduleExists) return res.status(404).json({ message: "Module not found" });

    const request = await TrainingRequest.create({
      module: moduleId,
      requestedBy: req.user.userId,
      justification
    });

    await sendTrainingInviteEmail({
      to: String(email).trim(),
      fullName: fullName || "Client",
      moduleTitle: moduleExists.title || "Training Module",
      inviteLink: `${process.env.APP_URL || "http://localhost:5173"}/client-login`
    });

    return res.status(201).json(request);
  } catch (err) {
    console.error("TRAINING REQUEST ERROR:", err);
    return res.status(500).json({ message: "Failed to submit training request" });
  }
});


function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// configure email transport (Gmail example)
// Put these in .env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, APP_URL
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});



router.get("/", requireAuth, async (req, res) => {
  const requests = await TrainingRequest.find()
    .populate("module", "title status")
    .populate("requestedBy", "fullName email")  // ✅ your user has fullName
    .populate("reviewedBy", "fullName email");

  res.json(requests);
});

router.put("/:id", requireAuth, async (req, res) => {
  const request = await TrainingRequest.findByIdAndUpdate(
    req.params.id,
    {
      status: req.body.status,
      reviewedBy: req.user.userId
    },
    { new: true }
  );

  res.json(request);
});

module.exports = router;
