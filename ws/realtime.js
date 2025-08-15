// realtime/index.js
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// simple cookie parser for socket handshake
function getCookie(name, cookieHeader = "") {
  const parts = (cookieHeader || "").split(";").map((s) => s.trim());
  for (const p of parts)
    if (p.startsWith(name + "="))
      return decodeURIComponent(p.slice(name.length + 1));
  return null;
}

function attachRealtime(server, app, { corsOptions }) {
  const io = new Server(server, {
    cors: {
      origin: corsOptions.origin,
      credentials: true,
      allowedHeaders: ["Authorization", "Content-Type", "Cookie"],
    },
    // keep both so it works behind some hosts/proxies
    transports: ["websocket", "polling"],
  });

  // expose io to express routes if you ever need it
  app.set("io", io);

  /* --------------------------- auth middleware --------------------------- */
  io.use((socket, next) => {
    try {
      const tokenFromAuth = socket.handshake.auth?.token;
      const tokenFromCookie = getCookie("token", socket.request.headers.cookie);
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

  /* --------------------------- presence tracking ------------------------- */
  // userId -> Set<socketId>
  const socketsByUser = new Map();

  const broadcastSnapshot = () => {
    const onlineIds = [...socketsByUser.entries()]
      .filter(([, s]) => s.size > 0)
      .map(([id]) => String(id));
    io.emit("presence:snapshot", onlineIds);
  };

  io.on("connection", (socket) => {
    const userId = String(socket.userId);

    // track this connection
    if (!socketsByUser.has(userId)) socketsByUser.set(userId, new Set());
    const set = socketsByUser.get(userId);
    const firstConnection = set.size === 0;
    set.add(socket.id);

    // optional personal room
    socket.join(`user:${userId}`);

    // tell THIS socket who is online right now
    socket.emit(
      "presence:snapshot",
      [...socketsByUser.entries()]
        .filter(([, s]) => s.size > 0)
        .map(([id]) => String(id))
    );

    // if this is the user’s first tab/connection, announce they came online
    if (firstConnection) {
      io.emit("presence:update", { userId, online: true });
      // optional: refresh everyone’s list only when state changes
      broadcastSnapshot();
    }

    socket.on("disconnect", () => {
      const s = socketsByUser.get(userId);
      if (!s) return;
      s.delete(socket.id);
      if (s.size === 0) {
        socketsByUser.delete(userId); // cleanup
        io.emit("presence:update", { userId, online: false });
        broadcastSnapshot();
      }
    });
  });

  /* --------------------------- optional REST helper ---------------------- */
  // GET /api/presence/online  ->  returns array of online userIds
  app.get("/api/presence/online", (req, res) => {
    const online = [...socketsByUser.entries()]
      .filter(([, s]) => s.size > 0)
      .map(([id]) => String(id));
    res.json(online);
  });

  return io;
}

module.exports = attachRealtime;
