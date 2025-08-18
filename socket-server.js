const { Server } = require("socket.io");
const { Message } = require("./database");

let io;

const onlineUsers = new Map();

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

const initSocketServer = (server) => {
  try {
    io = new Server(server, { cors: corsOptions });

    io.on("connection", (socket) => {
      socket.on("register", (userId) => {
        const intUserId = parseInt(userId, 10);
        onlineUsers.set(intUserId, socket.id);
        socket.userId = intUserId;
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
        }
      });
    });
  } catch (error) {}
};

module.exports = initSocketServer;
