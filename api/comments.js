const express = require("express");
const router = express.Router();
const { Comments, User, Posts, Notification } = require("../database");
const { authenticateJWT } = require("../auth");

// get the comments of a specific post
router.get("/posts/:postId/comments", async (req, res) => {
  try {
    const { postId } = req.params;

    const comments = await Comments.findAll({
      where: { post_id: postId },
      include: [
        {
          model: User,
          as: "author",
          attributes: [
            "id",
            "username",
            "spotifyDisplayName",
            "profileImage",
            "avatarURL",
          ],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    res.json(comments);
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

// post comments to a specific post
router.post("/posts/:postId/comments", authenticateJWT, async (req, res) => {
  try {
    const { postId } = req.params;
    const { content, parentId } = req.body;
    const userId = req.user.id;

    // 1) create comment
    const comment = await Comments.create({
      post_id: postId,
      user_id: userId,
      content,
      parent_id: parentId || null,
    });

    // 2) return shape for the client (author included)
    const createdComment = await Comments.findByPk(comment.id, {
      include: [
        {
          model: User,
          as: "author",
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

    // 3) notify post owner
    const post = await Posts.findByPk(postId);

    if (post && post.userId !== userId) {
      // persist notification
      const notif = await Notification.create({
        userId: post.userId, // recipient (post owner)
        fromUserId: userId, // actor (commenter)
        type: "comment",
        postId: post.id,
        commentId: comment.id,
        content: comment.content,
      });

      // build actor with the EXACT keys the frontend uses
      const actorUser = await User.findByPk(userId, {
        attributes: [
          "id",
          "username",
          "spotifyDisplayName",
          "profileImage",
          "spotifyProfileImage",
          "avatarURL",
        ],
      });

      const io = req.app.get("io");
      io?.to(String(post.userId)).emit("notification:new", {
        id: notif.id,
        type: "comment",
        postId: post.id,
        commentId: comment.id,
        content: comment.content,
        seen: false,
        createdAt: notif.createdAt, // keep DB timestamp
        actor: {
          id: actorUser.id,
          username: actorUser.username,
          spotifyDisplayName: actorUser.spotifyDisplayName,
          // IMPORTANT: image fields your component already checks:
          spotifyProfileImage: actorUser.spotifyProfileImage,
          profileImage: actorUser.profileImage,
          avatarURL: actorUser.avatarURL,
        },
      });
    }

    res.json(createdComment);
  } catch (error) {
    console.error("Error creating comment:", error);
    res.status(500).json({ error: "Failed to create comment" });
  }
});

// delete comments of a specific post
router.delete("/:id", authenticateJWT, async (req, res) => {
  try {
    const commentId = req.params.id;
    const userId = req.user.id;

    const deleted = await Comments.destroy({
      where: {
        id: commentId,
        user_id: userId,
      },
    });

    if (deleted === 0) {
      return res
        .status(404)
        .json({ error: "Comment not found or unauthorized" });
    }

    res.status(204).end();
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(500).json({ error: "Failed to delete comment" });
  }
});

module.exports = router;
