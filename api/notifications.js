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

// Get notifications (only not dismissed)
router.get("/", authenticateJWT, async (req, res) => {
  try {
    const rows = await Notification.findAll({
      where: { userId: req.user.id, dismissed: false },
      include: [
        {
          model: User,
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
      order: [["createdAt", "DESC"]],
      limit: 50,
    });

    res.json(rows);
  } catch (e) {
    console.error("Error fetching notifications:", e);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// Dismiss a single notification
router.post("/:id/dismiss", authenticateJWT, async (req, res) => {
  try {
    await Notification.update(
      { dismissed: true },
      { where: { id: req.params.id, userId: req.user.id } }
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to dismiss notification" });
  }
});

// Dismiss all notifications for the user
router.post("/dismiss-all", authenticateJWT, async (req, res) => {
  try {
    await Notification.update(
      { dismissed: true },
      { where: { userId: req.user.id, dismissed: false } }
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to dismiss all notifications" });
  }
});

module.exports = router;