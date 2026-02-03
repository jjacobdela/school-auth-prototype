const express = require("express");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const User = require("../models/User");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function normalizeEmail(email) {
  return (email || "").trim().toLowerCase();
}

function isProtectedAdminEmail(email) {
  return normalizeEmail(email) === "admin@gmail.com";
}

/**
 * GET /api/users
 * Admin-only: list all users
 */
router.get("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await User.find({})
      .sort({ createdAt: -1 })
      .select("_id fullName email role status createdAt updatedAt");

    return res.json({ users });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * POST /api/users/applicants
 * Admin-only: create an applicant user
 * body: { fullName, email, password }
 */
router.post("/applicants", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { fullName, email, password } = req.body || {};

    if (!isNonEmptyString(fullName) || fullName.trim().length < 2) {
      return res.status(400).json({ message: "fullName is required (min 2 chars)" });
    }

    if (!isNonEmptyString(email) || !isValidEmail(email)) {
      return res.status(400).json({ message: "Valid email is required" });
    }

    if (!isNonEmptyString(password) || password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const normalized = normalizeEmail(email);

    if (isProtectedAdminEmail(normalized)) {
      return res.status(400).json({ message: "admin@gmail.com cannot be created as an applicant" });
    }

    const existing = await User.findOne({ email: normalized }).select("_id");
    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      fullName: fullName.trim(),
      email: normalized,
      passwordHash,
      role: "applicant",
      status: "Active"
    });

    return res.status(201).json({
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * PATCH /api/users/:id/status
 * Admin-only: set status Active/Disabled
 * body: { status: "Active" | "Disabled" }
 */
router.patch("/:id/status", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    if (status !== "Active" && status !== "Disabled") {
      return res.status(400).json({ message: "status must be Active or Disabled" });
    }

    const user = await User.findById(id).select("_id email role status fullName createdAt updatedAt");
    if (!user) return res.status(404).json({ message: "User not found" });

    if (isProtectedAdminEmail(user.email)) {
      return res.status(403).json({ message: "admin@gmail.com cannot be disabled" });
    }

    user.status = status;
    await user.save();

    return res.json({
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * DELETE /api/users/:id
 * Admin-only: delete a user
 */
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const user = await User.findById(id).select("_id email");
    if (!user) return res.status(404).json({ message: "User not found" });

    if (isProtectedAdminEmail(user.email)) {
      return res.status(403).json({ message: "admin@gmail.com cannot be deleted" });
    }

    await User.deleteOne({ _id: id });
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
