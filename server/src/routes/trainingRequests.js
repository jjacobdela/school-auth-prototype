const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");

const TrainingRequest = require("../models/TrainingRequest");
const Module = require("../models/Module");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");

const { sendTrainingInviteEmail } = require("../utils/mailer");

// ---------- helpers ----------
function generateTempPassword() {
  const random = Math.floor(1000 + Math.random() * 9000);
  return `A${random}!`;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

// ---------- routes ----------
router.post("/", requireAuth, async (req, res) => {
  try {
    console.log("REQ.BODY:", req.body);

    const { moduleId, fullName, email, contact, company, justification } = req.body || {};

    if (!moduleId) return res.status(400).json({ message: "moduleId is required" });
    if (!fullName?.trim()) return res.status(400).json({ message: "fullName is required" });
    if (!email?.trim()) return res.status(400).json({ message: "email is required" });
    if (!justification?.trim()) return res.status(400).json({ message: "justification is required" });

    const normalizedEmail = normalizeEmail(email);

    const moduleExists = await Module.findById(moduleId);
    if (!moduleExists) return res.status(404).json({ message: "Module not found" });

    // ✅ allow requests only for published modules (optional but recommended)
    if (String(moduleExists.status || "draft").toLowerCase() !== "published") {
      return res.status(400).json({ message: "Module must be published before requesting training." });
    }

    // ✅ create/find applicant user for the recipient email
    let user = await User.findOne({ email: normalizedEmail });
    let tempPassword = null;

    if (!user) {
      tempPassword = generateTempPassword();
      const passwordHash = await bcrypt.hash(tempPassword, 12);

      // IMPORTANT: match your User schema field names
      user = await User.create({
        fullName: fullName.trim(),
        email: normalizedEmail,
        passwordHash, // ✅ FIX (was `password`)
        role: "applicant",
        status: "Active",
        company: company || "",
        contact: contact || ""
      });
    }

    // ✅ save training request
    const request = await TrainingRequest.create({
      module: moduleId,
      requestedBy: req.user.userId, // admin making the request
      justification: justification.trim()
      // if you want to store recipient details, you need schema changes
    });

    // ✅ send invite email
    const inviteLink = "http://localhost:5173/login";

    await sendTrainingInviteEmail({
      to: normalizedEmail,
      fullName: fullName.trim(),
      moduleTitle: moduleExists.title || "Training Module",
      inviteLink,
      tempPassword // pass this so email can include it (if new)
    });

    return res.status(201).json({
      message: "Training request created and invite email sent.",
      requestId: request._id,
      userCreated: Boolean(tempPassword) // true if we made a new account
    });
  } catch (err) {
    console.error("TRAINING REQUEST ERROR:", err);
    return res.status(500).json({
      message: err?.message || "Server error"
    });
  }
});

router.get("/", requireAuth, async (req, res) => {
  const requests = await TrainingRequest.find()
    .populate("module", "title status")
    .populate("requestedBy", "fullName email")
    .populate("reviewedBy", "fullName email");

  res.json(requests);
});



router.put("/:id", requireAuth, async (req, res) => {
  try {
    const { status } = req.body;

    const request = await TrainingRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });

    // update request status + reviewer
    request.status = status;
    request.reviewedBy = req.user.userId;
    await request.save();

    // ✅ if approved -> assign module to the applicant who requested it
    if (status === "approved") {
      await User.updateOne(
        { _id: request.requestedBy },
        { $addToSet: { assignedModules: request.module } } // avoids duplicates
      );
    }

    res.json(request);
  } catch (err) {
    console.error("UPDATE REQUEST ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
