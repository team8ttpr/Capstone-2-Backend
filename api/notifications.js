// api/notifications.js
const express = require("express");
const router = express.Router();
const {
  Notification,
  User,
  Posts,
  PostLike,
  Comments,
} = require("../database");
const { authenticateJWT } = require("../auth");

router.get("/", authenticateJWT, async (req, res) => {
  try {
    const rows = await Notification.findAll({
      where: { userId: req.user.id },
      include: [
        {
          model: User,
          as: "actor",
          attributes: ["id", "username", "avatarURL", "profileImage"],
        },
        { model: Posts, attributes: ["id", "title"] },
        { model: Comments, attributes: ["id", "content"] },
      ],
      order: [["createdAt", "DESC"]],
      limit: 50,
    });
    res.json(rows);
  } catch (e) {
    console.error("Error fetching notifications:", e);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

module.exports = router;
