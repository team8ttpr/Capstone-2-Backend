const { Server } = require("socket.io");
const { Message, Notification } = require("./database");

let io;

const onlineUsers = new Map();

// Helper to get liked posts
const emitToUser = (userId, event, payload) => {
  const sid =
    onlineUsers.get(String(userId)) || onlineUsers.get(parseInt(userId, 10)); // be tolerant of id types
  if (sid && io) io.to(sid).emit(event, payload);
};

const corsOptions = {
  origin: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://capstone-2-frontend-tan.vercel.app",
  ],
  credentials: true,
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
};

// Helper to get all online user IDs
const getSnapshot = () => Array.from(onlineUsers.keys());

// Helper to broadcast the current online user IDs to all clients
const broadcastSnapshot = () => {
  io.emit("presence:snapshot", getSnapshot());
};

const initSocketServer = (server, app) => {
  try {
    io = new Server(server, { cors: corsOptions });
    if (app) app.set("io", io);

    // Helper to emit to a specific user by their userId (uses the onlineUsers map)
    const emitToUser = (userId, event, payload) => {
      const sid = onlineUsers.get(Number(userId));
      if (sid) io.to(sid).emit(event, payload);
    };
    if (app) app.set("emitToUser", emitToUser);

    io.on("connection", (socket) => {
      socket.emit("presence:snapshot", getSnapshot());

      socket.on("register", (userId) => {
        const intUserId = parseInt(userId, 10);
        onlineUsers.set(intUserId, socket.id);
        socket.userId = intUserId;
        socket.join(String(intUserId));
        io.emit("presence:update", { userId: intUserId, online: true });
        broadcastSnapshot();
      });

      socket.on("test_event", (data) => {});

      socket.on("typing", ({ to }) => {
        const recipientSocketId = onlineUsers.get(parseInt(to, 10));
        if (recipientSocketId) {
          io.to(recipientSocketId).emit("typing", { from: socket.userId });
        }
      });

      socket.on("stop_typing", ({ to }) => {
        const recipientSocketId = onlineUsers.get(parseInt(to, 10));
        if (recipientSocketId) {
          io.to(recipientSocketId).emit("stop_typing", { from: socket.userId });
        }
      });

      socket.on("read_messages", async ({ from }) => {
        const intFrom = parseInt(from, 10);
        await Message.update(
          { read: true },
          {
            where: {
              senderId: intFrom,
              receiverId: socket.userId,
              read: false,
            },
          }
        );
        const senderSocketId = onlineUsers.get(intFrom);
        if (senderSocketId) {
          io.to(senderSocketId).emit("messages_read", { by: socket.userId });
        }
      });

      socket.on("send_message", async (data) => {
        const { to, content, type, fileUrl } = data;
        const from = socket.userId;
        const intTo = parseInt(to, 10);
        if (!from || !intTo || (!content && !fileUrl)) return;

        try {
          const message = await Message.create({
            senderId: from,
            receiverId: intTo,
            content: content || "",
            type: type || "text",
            fileUrl: fileUrl || null,
            read: false,
          });

          const recipientSocketId = onlineUsers.get(intTo);
          if (recipientSocketId) {
            io.to(recipientSocketId).emit("receive_message", {
              ...message.toJSON(),
            });
          }

          socket.emit("receive_message", {
            ...message.toJSON(),
          });
        } catch (err) {}
      });

      socket.on("disconnect", () => {
        if (socket.userId) {
          onlineUsers.delete(socket.userId);
          io.emit("presence:update", { userId: socket.userId, online: false });
          broadcastSnapshot();
        }
      });
    });

    // Heartbeat every 10 seconds
    setInterval(() => {
      broadcastSnapshot();
    }, 10000);
  } catch (error) {
    // Optionally log error
  }
};

module.exports = initSocketServer;
module.exports.emitToUser = emitToUser;
