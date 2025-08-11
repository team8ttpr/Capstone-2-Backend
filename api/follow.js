const express = require("express");
const router = express.Router();
const { User, Posts, Follows } = require("../database");
const { authenticateJWT } = require("../auth");

// Check if current user is following another user
router.get("/:username/following-status", authenticateJWT, async (req, res) => {
  try {
    const userToCheck = await User.findOne({
      where: { username: req.params.username },
    });

    if (!userToCheck) {
      return res.status(404).json({ error: "User not found" });
    }

    const isFollowing = await Follows.findOne({
      where: {
        followerId: req.user.id,
        followingId: userToCheck.id,
      },
    });

    res.json({ following: !!isFollowing });
  } catch (error) {
    console.error("Error checking following status:", error);
    res.status(500).json({ error: "Failed to check following status" });
  }
});

// Get user's followers
router.get("/:username/followers", async (req, res) => {
  try {
    const user = await User.findOne({
      where: { username: req.params.username },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const followers = await Follows.findAll({
      where: { followingId: user.id },
      include: [
        {
          model: User,
          as: "follower",
          attributes: [
            "id",
            "username",
            "firstName",
            "lastName",
            "profileImage",
            "spotifyProfileImage",
            "avatarURL",
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: 50,
    });

    res.json(followers.map((follow) => follow.follower));
  } catch (error) {
    console.error("Error fetching followers:", error);
    res.status(500).json({ error: "Failed to fetch followers" });
  }
});

// Get user's following
router.get("/:username/following", async (req, res) => {
  try {
    const user = await User.findOne({
      where: { username: req.params.username },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const following = await Follows.findAll({
      where: { followerId: user.id },
      include: [
        {
          model: User,
          as: "following",
          attributes: [
            "id",
            "username",
            "firstName",
            "lastName",
            "profileImage",
            "spotifyProfileImage",
            "avatarURL",
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: 50,
    });

    res.json(following.map((follow) => follow.following));
  } catch (error) {
    console.error("Error fetching following:", error);
    res.status(500).json({ error: "Failed to fetch following" });
  }
});
module.exports = router;
