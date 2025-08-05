const express = require("express");
const router = express.Router();
const { Posts, User } = require("../database"); // Correct import
const { authenticateJWT } = require("../auth");

// Get all posts (public)
router.get("/", async (req, res) => {
  try {
    const posts = await Posts.findAll({
      where: { isPublic: true },
      include: [
        {
          model: User,
          as: "author",
          attributes: ["username", "id"],
        },
      ],
    });
    res.json(posts);
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

// Get all posts by the logged-in user
router.get("/mine", authenticateJWT, async (req, res) => {
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

//get a single post by ID
router.get("/:id", async (req, res) => {
  try {
    const postId = req.params.id;
    const post = await Posts.findByPk(postId, {
      include: [
        {
          model: User,
          as: "author",
          attributes: ["username", "id"],
        },
      ],
    });

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.json(post);
  } catch (error) {
    console.error("Error fetching post:", error);
    res.status(500).json({ error: "Failed to fetch post" });
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

//Edit a post if post not published
router.patch("/:id", authenticateJWT, async (req, res) => {
  try {
    const postId = req.params.id;
    const { title, description, content, status } = req.body;

    const post = await Posts.findByPk(postId);

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    post.title = title || post.title;
    post.description = description || post.description;
    post.content = content || post.content;
    post.status = status || post.status;

    await post.save();

    res.json(post);
  } catch (error) {
    console.error("Error updating post:", error);
    res.status(500).json({ error: "Failed to update post" });
  }
});

//Delete a post
router.delete("/:id", authenticateJWT, async (req, res) => {
  try {
    const postId = req.params.id;
    const post = await Posts.findByPk(postId);

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    await post.destroy();
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({ error: "Failed to delete post" });
  }
});

module.exports = router;
