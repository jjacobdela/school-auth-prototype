const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");

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

function signToken(user) {
  return jwt.sign(
    { userId: user._id.toString(), email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { fullName, email, password } = req.body || {};

    if (!isNonEmptyString(fullName) || !isNonEmptyString(email) || !isNonEmptyString(password)) {
      return res.status(400).json({ message: "fullName, email, and password are required" });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const normalized = normalizeEmail(email);

    const existing = await User.findOne({ email: normalized });
    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const isAdmin = normalized === "admin@gmail.com";

    const user = await User.create({
      fullName: fullName.trim(),
      email: normalized,
      passwordHash,
      role: isAdmin ? "admin" : "applicant",
      status: "Active"
    });

    const token = signToken(user);
    return res.status(201).json({
      token,
      user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role, status: user.status }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
      return res.status(400).json({ message: "email and password are required" });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const normalized = normalizeEmail(email);

    const user = await User.findOne({ email: normalized });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (user.status === "Disabled") {
      return res.status(403).json({ message: "Account is disabled" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = signToken(user);
    return res.json({
      token,
      user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role, status: user.status }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

// GET /api/auth/me (protected)
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("_id fullName email role status createdAt");
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.status === "Disabled") {
      return res.status(403).json({ message: "Account is disabled" });
    }

    return res.json({ user });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
