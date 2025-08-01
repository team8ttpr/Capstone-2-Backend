const express = require("express");
const router = express.Router();
const { Posts } = require("../database"); // Correct import
const { authenticateJWT } = require("../auth");

// Get all posts (public)
// Get all posts by the logged-in user
router.get("/", authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const posts = await Posts.findAll({
      where: { userId },
    });
    res.json(posts);
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

// Create a new post (requires authentication)
router.post("/", authenticateJWT, async (req, res) => {
  try {
    const { title, description, status } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    const newPost = await Posts.create({
      title,
      description,
      status,
      userId: req.user.id, // from token
    });

    res.status(201).json(newPost);
  } catch (error) {
    console.error("Error creating post:", error);
    res.status(500).json({ error: "Failed to create post" });
  }
});

module.exports = router;
