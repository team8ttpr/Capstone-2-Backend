const express = require("express");
const router = express.Router();
const { Post, User } = require("../database"); // Correct import
const { authenticateJWT } = require("../auth");

// Get all posts (public)
router.get("/", async (req, res) => {
  try {
    const posts = await Post.findAll({
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

router.get("/test", (req, res) => {
  res.send("posts test route OK");
});
// Get post if status === draft
router.get("/drafts", authenticateJWT, async (req, res) => {
  try {
    const drafts = await Post.findAll({
      where: {
        userId: req.user.id,
        status: "draft",
      },
    });
    res.json(drafts);
  } catch (err) {
    console.error("Error fetching draft posts:", err);
    res.status(500).json({ error: "Failed to fetch drafts" });
  }
});

// Get post if status === published
router.get("/published", authenticateJWT, async (req, res) => {
  try {
    const published = await Post.findAll({
      where: {
        userId: req.user.id,
        status: "published",
      },
    });
    res.json(published);
  } catch (err) {
    console.error("Error fetching published posts:", err);
    res.status(500).json({ error: "Failed to fetch published posts" });
  }
});
// Get all posts by the logged-in user
router.get("/mine", authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const posts = await Post.findAll({
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
    const post = await Post.findByPk(postId, {
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

    const newPost = await Post.create({
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

//POST api/posts/draft --- Create a draft endpoint (first time when user click on save as draft)
router.post("/draft", authenticateJWT, async (req, res) => {
  try {
    const { title, description, spotifyId, spotifyType } = req.body;

    if (!title || title.trim() === "") {
      return res.status(400).json({ error: "Title is required" }); //title is required even for drafts
    }

    const postData = {
      title: title.trim(),
      description: description || null,
      status: "draft",
      userId: req.user.id,
    };
    // handle single Spotify item if user included (optional)
    if (spotifyId && spotifyType) {
      postData.spotifyId = spotifyId;
      postData.spotifyType = spotifyType;
    }
    const newDraft = await Post.create(postData);
    res.status(201).json(newDraft);
  } catch (error) {
    console.error("Error creating draft:", error);
    res.status(500).json({ error: "Failed to create draft" });
  }
});

// PATCH api/posts/draft/:id ------ Update a draft endpoint
router.patch("/draft/:id", authenticateJWT, async (req, res) => {
  try {
    const { title, description, spotifyId, spotifyType } = req.body;

    if (title !== undefined && !title.trim()) {
      return res.status(400).json({ error: "Title cannot be empty" });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description || null;
    if (spotifyId !== undefined) updateData.spotifyId = spotifyId || null;
    if (spotifyType !== undefined) updateData.spotifyType = spotifyType || null;

    const [updatedRowsCount] = await Post.update(updateData, {
      where: {
        id: parseInt(req.params.id),
        userId: req.user.id,
        status: "draft",
      },
    });

    if (updatedRowsCount === 0) {
      return res
        .status(404)
        .json({ error: "Draft post not found or unauthorized" });
    }

    res.json({ message: "Draft updated successfully" });
  } catch (error) {
    console.error("Error updating draft:", error);
    res.status(500).json({ error: "Failed to update draft" });
  }
});

//Edit a post if post not published
router.patch("/:id", authenticateJWT, async (req, res) => {
  try {
    const postId = req.params.id;
    const { title, description, content, status } = req.body;

    const post = await Post.findByPk(postId);

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (post.status === "published") {
      return res
        .status(403)
        .json({ error: "Cannot edit already published post" });
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
    const post = await Post.findByPk(postId);

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
