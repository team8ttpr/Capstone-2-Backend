require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const path = require("path");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const http = require("http");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const app = express();
const apiRouter = require("./api");
const { router: authRouter } = require("./auth");
const spotifyRouter = require("./auth/spotify");
const { db } = require("./database");
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

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

/* ------------------------- Create HTTP + Socket.IO ------------------------ */
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: corsOptions.origin,
    credentials: true,
  },
  // transports: ["websocket"], // optional, can force WS only
});

// Make io reachable in any Express route: req.app.get('io')
app.set("io", io);

/* --------------------------- Socket auth helper --------------------------- */
function getCookie(name, cookieHeader = "") {
  const parts = cookieHeader.split(";").map((s) => s.trim());
  for (const p of parts) {
    if (p.startsWith(name + "="))
      return decodeURIComponent(p.slice(name.length + 1));
  }
  return null;
}

io.use((socket, next) => {
  try {
    // If you pass a token from the client: io(API_URL, { auth:{token} })
    const tokenFromAuth = socket.handshake.auth?.token;
    // Or rely on httpOnly cookie sent automatically withCredentials: true
    const tokenFromCookie = getCookie(
      "token",
      socket.request.headers.cookie || ""
    );
    const token = tokenFromAuth || tokenFromCookie;
    if (!token) return next(new Error("No token"));

    const payload = jwt.verify(token, JWT_SECRET);
    socket.userId = String(payload.id);
    socket.username = payload.username;
    next();
  } catch (err) {
    next(new Error("Bad token"));
  }
});

/* ----------------------------- Presence store ----------------------------- */
// userId -> Set<socketId>
const socketsByUser = new Map();

io.on("connection", (socket) => {
  const userId = socket.userId;

  // Track this connection
  if (!socketsByUser.has(userId)) socketsByUser.set(userId, new Set());
  const set = socketsByUser.get(userId);
  const firstConnection = set.size === 0;
  set.add(socket.id);

  // Personal room for future targeted notifications
  socket.join(`user:${userId}`);

  // Send snapshot of who is online to the newly connected socket
  const onlineIds = [...socketsByUser.entries()]
    .filter(([, s]) => s.size > 0)
    .map(([id]) => id);
  socket.emit("presence:snapshot", onlineIds);

  // Broadcast "came online" if this was the first tab for the user
  if (firstConnection) {
    io.emit("presence:update", { userId, online: true });
  }

  socket.on("disconnect", () => {
    const s = socketsByUser.get(userId);
    if (!s) return;
    s.delete(socket.id);
    if (s.size === 0) {
      io.emit("presence:update", { userId, online: false });
    }
  });
});

// Every 10s, broadcast a full presence snapshot to all sockets
const SNAPSHOT_MS = 10_000;
setInterval(() => {
  const onlineIds = [...socketsByUser.entries()]
    .filter(([, s]) => s.size > 0)
    .map(([id]) => String(id)); // normalize
  io.emit("presence:snapshot", onlineIds);
}, SNAPSHOT_MS);

app.get("/api/presence/online", (req, res) => {
  const online = [...socketsByUser.entries()]
    .filter(([, s]) => s.size > 0)
    .map(([id]) => id);
  res.json(online);
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res
    .status(500)
    .json({ error: "Internal server error", details: err.message });
});

const runApp = async () => {
  try {
    await db.sync();
    console.log("✅ Connected to the database");
    await db.sync({ alter: true });
    console.log("✅ Database synced successfully");
    server.listen(PORT, () => {
      console.log(`🚀 API + WebSockets running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Unable to connect to the database:", err);
  }
};

runApp();

module.exports = app;
