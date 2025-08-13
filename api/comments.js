const express = require("express");
const router = express.Router();
const { Comments, User } = require("../database");
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
          attributes: ["id", "username", "spotifyDisplayName", "profileImage", "avatarURL"]
        }
      ],
      order: [["created_at", "DESC"]]
    });
    
    res.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// post comments to a specific post
router.post("/posts/:postId/comments", authenticateJWT, async (req, res) => {
  try {
    const { postId } = req.params;
    const { content, parentId } = req.body;
    const userId = req.user.id;
    
    const comment = await Comments.create({
      post_id: postId,
      user_id: userId,
      content,
      parent_id: parentId || null
    });
    
    const createdComment = await Comments.findByPk(comment.id, {
      include: [
        {
          model: User,
          as: "author",
          attributes: ["id", "username", "spotifyDisplayName", "profileImage", "avatarURL"]
        }
      ]
    });
    
    res.json(createdComment);
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Failed to create comment' });
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
        user_id: userId 
      }
    });
    
    if (deleted === 0) {
      return res.status(404).json({ error: "Comment not found or unauthorized" });
    }
    
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

module.exports = router;