require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { connectDB } = require("./db");
const authRoutes = require("./routes/auth");
const examRoutes = require("./routes/exams");

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN,
    credentials: false
  })
);

app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/exams", examRoutes);

const port = process.env.PORT || 5000;

connectDB(process.env.MONGO_URI)
  .then(() => {
    app.listen(port, () => console.log(`✅ API running on http://localhost:${port}`));
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });
