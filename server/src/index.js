require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { connectDB } = require("./db");
const authRoutes = require("./routes/auth");
const examRoutes = require("./routes/exams");
const userRoutes = require("./routes/users");

const modulesRoute = require("./routes/modules");
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
app.use("/api/users", userRoutes);
app.use("/uploads", express.static("uploads"));

app.use("/api/modules", require("./routes/modules"));
app.use("/api/module-content", require("./routes/moduleContent"));
app.use("/api/training-requests", require("./routes/trainingRequests"));
app.use("/modules", require("./routes/modules"));
app.use("/module-content", require("./routes/moduleContent"));
app.use("/api/my-modules", require("./routes/mymodules"));



app.use("/api/modules", modulesRoute);




const port = process.env.PORT || 5001;

connectDB(process.env.MONGO_URI)
  .then(() => {
    app.listen(port, () => console.log(`✅ API running on http://localhost:${port}`));
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });
