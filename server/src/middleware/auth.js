const jwt = require("jsonwebtoken");
const User = require("../models/User");

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const [type, token] = authHeader.split(" ");

  if (type !== "Bearer" || !token) {
    return res.status(401).json({ message: "Missing or invalid Authorization header" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { userId, email }
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

async function requireAdmin(req, res, next) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });

    const dbUser = await User.findById(userId).select("_id email role status");
    if (!dbUser) return res.status(401).json({ message: "User not found" });

    if (dbUser.status === "Disabled") {
      return res.status(403).json({ message: "Account is disabled" });
    }

    const email = (dbUser.email || "").toLowerCase();
    const isAdminEmail = email === "admin@gmail.com";
    const isAdminRole = dbUser.role === "admin";

    if (!isAdminEmail && !isAdminRole) {
      return res.status(403).json({ message: "Admin access required" });
    }

    req.adminUser = dbUser;
    return next();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
}

module.exports = { requireAuth, requireAdmin };
