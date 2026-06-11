require("dotenv").config();
require("./config/cloudinary");
const express = require("express");
const morgan = require("morgan");
const path = require("path");
const cookieParser = require("cookie-parser");
const app = express();
const apiRouter = require("./api");
const { router: authRouter } = require("./auth");
const spotifyRouter = require("./auth/spotify");
const { db } = require("./database");
const cors = require("cors");
const http = require("http");

const PORT = process.env.PORT || 8080;

app.use(express.json());

const corsOptions = {
  origin: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:15500",
    "https://capstone-2-frontend-tan.vercel.app",
  ],
  credentials: true,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
};

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(morgan("dev"));
app.use(express.static(path.join(__dirname, "public")));
app.use("/api", apiRouter);
app.use("/auth", authRouter);
app.use("/auth/spotify", spotifyRouter);
app.use("/api/messages", require("./api/messages"));
app.use("/api/notifications", require("./api/notifications"));


const server = http.createServer(app);

const { initSocketServer } = require("./socket-server");
initSocketServer(server, app);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res
    .status(500)
    .json({ error: "Internal server error", details: err.message });
});

const runApp = async () => {
  // Listen immediately so cold starts aren't blocked waiting on the DB sync
  server.listen(PORT, () => {
    console.log(`🚀 API + WebSockets running on port ${PORT}`);
  });
  try {
    // alter: true introspects every table on boot — too slow for production
    const alter = process.env.NODE_ENV !== "production";
    await db.sync({ alter });
    console.log("✅ Database synced successfully");
  } catch (err) {
    console.error("❌ Unable to connect to the database:", err);
  }
};

runApp();

module.exports = app;
