const { Server } = require("socket.io");
const { Message } = require("./database");

let io;

const onlineUsers = new Map();

const corsOptions = {
  origin: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://capstone-2-frontend-tan.vercel.app"
  ],
  credentials: true,
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
};

const initSocketServer = (server) => {
  try {
    io = new Server(server, { cors: corsOptions });

    io.on("connection", (socket) => {
      console.log(`🔗 User ${socket.id} connected to sockets`);

      socket.on("register", (userId) => {
        onlineUsers.set(String(userId), socket.id);
        socket.userId = String(userId);
        console.log(`User ${userId} registered with socket ${socket.id}`);
      });

      socket.on("test_event", (data) => {
        console.log("Test event received:", data, "from socket", socket.id);
      });

      socket.on("send_message", async (data) => {
        console.log("send_message event received:", data, "from user", socket.userId);
        const { to, content } = data;
        const from = socket.userId;
        if (!from || !to || !content) return;

        try {
          const message = await Message.create({
            senderId: from,
            receiverId: to,
            content,
            read: false,
          });

          const recipientSocketId = onlineUsers.get(String(to));
          if (recipientSocketId) {
            console.log("Emitting receive_message to recipient:", recipientSocketId);
            io.to(recipientSocketId).emit("receive_message", {
              ...message.toJSON(),
            });
          }

          console.log("Emitting receive_message to sender:", socket.id);
          socket.emit("receive_message", {
            ...message.toJSON(),
          });
        } catch (err) {
          console.error("Error handling send_message:", err);
        }
      });

      socket.on("disconnect", () => {
        if (socket.userId) {
          onlineUsers.delete(socket.userId);
        }
        console.log(`🔗 User ${socket.id} disconnected from sockets`);
      });
    });
  } catch (error) {
    console.error("❌ Error initializing socket server:");
    console.error(error);
  }
};

module.exports = initSocketServer;