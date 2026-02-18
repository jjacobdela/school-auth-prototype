const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");
const User = require("../models/User");
const Module = require("../models/Module");

router.get("/", requireAuth, async (req, res) => {
  const user = await User.findById(req.user.userId).select("email role assignedModules");
  console.log("MYMODULES USER:", user);

  return res.json({
    userId: req.user.userId,
    role: user?.role,
    assignedModules: user?.assignedModules
  });
});

router.get("/", requireAuth, async (req, res) => {
  try {
    // Get the logged-in user
    const user = await User.findById(req.user.userId).select("assignedModules role");
    if (!user) return res.status(404).json({ message: "User not found" });

    // Applicants: only assigned modules
    if (user.role === "applicant") {
      const ids = user.assignedModules || [];

      const modules = await Module.find({
        _id: { $in: ids },
        status: "published"
      })
        .select("title description pages status createdAt")
        .sort({ createdAt: -1 });

      return res.json(
        modules.map((m) => ({
          _id: m._id,
          title: m.title,
          description: m.description,
          status: m.status,
          pagesCount: (m.pages || []).length,
          createdAt: m.createdAt
        }))
      );
    }

    // Admin: if you want, you can block or return empty
    return res.json([]);
  } catch (err) {
    console.error("MY MODULES ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
