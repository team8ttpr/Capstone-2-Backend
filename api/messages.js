const express = require("express");
const router = express.Router();
const { User, Follows, Message } = require("../database");
const { authenticateJWT } = require("../auth");
const { Op } = require("sequelize");

// Get list of friends
router.get("/friends", authenticateJWT, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    const following = await user.getFollowing();
    const followers = await user.getFollowers();
    const friends = following.filter(f =>
      followers.some(fl => fl.id === f.id)
    );
    res.json(friends);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch friends" });
  }
});

// Get message history between logged-in user and another user
router.get("/:userId", authenticateJWT, async (req, res) => {
  try {
    const otherUserId = parseInt(req.params.userId, 10);
    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { senderId: req.user.id, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: req.user.id }
        ]
      },
      order: [["createdAt", "ASC"]],
    });
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// Send a new message to another user
router.post("/:userId", authenticateJWT, async (req, res) => {
  try {
    const receiverId = parseInt(req.params.userId, 10);
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: "Message content required" });

    const message = await Message.create({
      senderId: req.user.id,
      receiverId,
      content,
      read: false,
    });

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: "Failed to send message" });
  }
});

// Mark messages as read
router.patch("/:userId/read", authenticateJWT, async (req, res) => {
  try {
    const otherUserId = parseInt(req.params.userId, 10);
    await Message.update(
      { read: true },
      {
        where: {
          senderId: otherUserId,
          receiverId: req.user.id,
          read: false,
        },
      }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to mark messages as read" });
  }
});

module.exports = router;