const { Server } = require("socket.io");
const { Message, Notification, User, Post } = require("./database");

let io;

const onlineUsers = new Map();

// Helper to emit to a specific user by their userId (uses the onlineUsers map)
const emitToUser = (userId, event, payload) => {
  const sid = onlineUsers.get(Number(userId));
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
    if (app) app.set("emitToUser", emitToUser);

    io.on("connection", (socket) => {
      socket.emit("presence:snapshot", getSnapshot());

      socket.on("register", (userId) => {
        const intUserId = Number(userId);
        console.log("REGISTER: userId", intUserId, "socketId", socket.id);
        if (!intUserId) {
          console.warn("register: invalid userId", userId);
          return;
        }
        onlineUsers.set(intUserId, socket.id);
        socket.userId = intUserId;
        socket.join(intUserId);
        io.emit("presence:update", { userId: intUserId, online: true });
        broadcastSnapshot();
        console.log(
          "Current onlineUsers map:",
          Array.from(onlineUsers.entries())
        );
      });

      socket.on("test_event", (data) => {});

      socket.on("typing", ({ to }) => {
        if (!socket.userId) return;
        const recipientSocketId = onlineUsers.get(Number(to));
        if (recipientSocketId) {
          io.to(recipientSocketId).emit("typing", { from: socket.userId });
        }
      });

      socket.on("stop_typing", ({ to }) => {
        if (!socket.userId) return;
        const recipientSocketId = onlineUsers.get(Number(to));
        if (recipientSocketId) {
          io.to(recipientSocketId).emit("stop_typing", { from: socket.userId });
        }
      });

      socket.on("read_messages", async ({ from }) => {
        if (!socket.userId) {
          console.warn("read_messages: socket.userId is undefined, aborting.");
          return;
        }
        const intFrom = Number(from);
        if (!intFrom) {
          console.warn("read_messages: invalid from value", from);
          return;
        }
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
        if (!socket.userId) return;
        const { to, content, type, fileUrl, spotifyEmbedUrl } = data;
        const from = socket.userId;
        const intTo = Number(to);
        if (!from || !intTo || (!content && !fileUrl && !spotifyEmbedUrl)) return;

        try {
          console.log(
            "SEND_MESSAGE: from",
            from,
            "to",
            intTo,
            "content",
            content
          );
          console.log(
            "Current onlineUsers map:",
            Array.from(onlineUsers.entries())
          );

          const message = await Message.create({
            senderId: from,
            receiverId: intTo,
            content: content || "",
            type: type || "text",
            fileUrl: fileUrl || null,
            spotifyEmbedUrl: spotifyEmbedUrl || null,
            read: false,
          });

          // Create a notification in the DB for the recipient and emit in real time
          if (from !== intTo) {
            const notif = await Notification.create({
              userId: intTo,
              type: "message",
              fromUserId: from,
              message: "You have a new message.",
              read: false,
            });
            const notifWithActor = await Notification.findOne({
              where: { id: notif.id },
              include: [
                {
                  model: require("./database").User,
                  as: "actor",
                  attributes: [
                    "id",
                    "username",
                    "spotifyDisplayName",
                    "profileImage",
                    "spotifyProfileImage",
                    "avatarURL",
                  ],
                },
              ],
            });
            const recipientSocketId = onlineUsers.get(intTo);
            if (recipientSocketId) {
              io.to(recipientSocketId).emit(
                "notification:new",
                notifWithActor.toJSON()
              );
              console.log(
                "Emitted notification:new to",
                intTo,
                "socket:",
                recipientSocketId
              );
            } else {
              console.log("No recipient socket found for notification", intTo);
            }
          }

          const recipientSocketId = onlineUsers.get(intTo);
          console.log(
            "Emitting receive_message to",
            intTo,
            "socket:",
            recipientSocketId
          );
          if (recipientSocketId) {
            io.to(recipientSocketId).emit("receive_message", {
              ...message.toJSON(),
            });
            console.log(
              "Emitted receive_message to",
              intTo,
              "socket:",
              recipientSocketId
            );
          } else {
            console.log("No recipient socket found for", intTo);
          }

          socket.emit("receive_message", {
            ...message.toJSON(),
          });
        } catch (err) {
          console.error("Error in send_message:", err);
        }
      });

      // Live comment notification
      socket.on("send_comment_notification", async (data) => {
        // data: { postOwnerId, commenterId, postId, commentText }
        const { postOwnerId, commenterId, postId, commentText } = data;
        if (!postOwnerId || !commenterId || !postId) return;
        try {
          const notif = await Notification.create({
            userId: postOwnerId,
            type: "comment",
            fromUserId: commenterId,
            postId: postId,
            content: commentText,
            read: false,
          });
          const notifWithActor = await Notification.findOne({
            where: { id: notif.id },
            include: [
              {
                model: require("./database").User,
                as: "actor",
                attributes: [
                  "id",
                  "username",
                  "spotifyDisplayName",
                  "profileImage",
                  "spotifyProfileImage",
                  "avatarURL",
                ],
              },
            ],
          });
          const recipientSocketId = onlineUsers.get(Number(postOwnerId));
          if (recipientSocketId) {
            io.to(recipientSocketId).emit(
              "notification:new",
              notifWithActor.toJSON()
            );
            console.log(
              "Emitted comment notification:new to",
              postOwnerId,
              "socket:",
              recipientSocketId
            );
          }
        } catch (err) {
          console.error("Error in send_comment_notification:", err);
        }
      });

      // Live repost notification
      socket.on("send_repost_notification", async (data) => {
        // data: { postOwnerId, reposterId, postId }
        const { postOwnerId, reposterId, postId } = data;
        if (!postOwnerId || !reposterId || !postId) return;
        try {
          const notif = await Notification.create({
            userId: postOwnerId,
            type: "repost",
            fromUserId: reposterId,
            postId: postId,
            message: "Your post was reposted.",
            read: false,
          });
          const notifWithActor = await Notification.findOne({
            where: { id: notif.id },
            include: [
              {
                model: require("./database").User,
                as: "actor",
                attributes: [
                  "id",
                  "username",
                  "spotifyDisplayName",
                  "profileImage",
                  "spotifyProfileImage",
                  "avatarURL",
                ],
              },
            ],
          });
          const recipientSocketId = onlineUsers.get(Number(postOwnerId));
          if (recipientSocketId) {
            io.to(recipientSocketId).emit(
              "notification:new",
              notifWithActor.toJSON()
            );
            console.log(
              "Emitted repost notification:new to",
              postOwnerId,
              "socket:",
              recipientSocketId
            );
          }
        } catch (err) {
          console.error("Error in send_repost_notification:", err);
        }
      });

      // Live follow notification
      socket.on("send_follow_notification", async (data) => {
        // data: { followedUserId, followerId }
        const { followedUserId, followerId } = data;
        if (!followedUserId || !followerId) return;
        try {
          const notif = await Notification.create({
            userId: followedUserId,
            type: "new_follower",
            fromUserId: followerId,
            message: "You have a new follower.",
            read: false,
          });
          const notifWithActor = await Notification.findOne({
            where: { id: notif.id },
            include: [
              {
                model: require("./database").User,
                as: "actor",
                attributes: [
                  "id",
                  "username",
                  "spotifyDisplayName",
                  "profileImage",
                  "spotifyProfileImage",
                  "avatarURL",
                ],
              },
            ],
          });
          const recipientSocketId = onlineUsers.get(Number(followedUserId));
          if (recipientSocketId) {
            io.to(recipientSocketId).emit(
              "notification:new",
              notifWithActor.toJSON()
            );
            console.log(
              "Emitted follow notification:new to",
              followedUserId,
              "socket:",
              recipientSocketId
            );
          }
        } catch (err) {
          console.error("Error in send_follow_notification:", err);
        }
      });

      socket.on("disconnect", () => {
        if (socket.userId) {
          onlineUsers.delete(socket.userId);
          io.emit("presence:update", { userId: socket.userId, online: false });
          broadcastSnapshot();
          console.log("User disconnected:", socket.userId);
        }
      });
    });

    // Heartbeat every 10 seconds
    setInterval(() => {
      broadcastSnapshot();
    }, 10000);
  } catch (error) {
    console.error("Socket server error:", error);
  }
};

module.exports = {
  initSocketServer,
  emitToUser,
};
