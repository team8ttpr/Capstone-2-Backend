const express = require("express");
const router = express.Router();
const { Posts, User } = require("../database");
const { authenticateJWT } = require("../auth");

// Get all published posts (public feed)
router.get("/feed", async (req, res) => {
  try {
    const posts = await Posts.findAll({
      where: { 
        status: 'published',
        isPublic: true 
      },
      include: [{
        model: User,
        as: 'author', 
        attributes: ['id', 'username', 'spotifyDisplayName', 'profileImage', 'spotifyProfileImage', 'avatarURL']
      }],
      order: [['createdAt', 'DESC']],
      limit: 20
    });
    
    res.json(posts);
  } catch (error) {
    console.error("Error fetching feed posts:", error);
    res.status(500).json({ error: "Failed to fetch feed posts" });
  }
});

// Get all posts (public)
router.get("/", async (req, res) => {
  try {
    const posts = await Posts.findAll({
      where: { isPublic: true },
      include: [
        {
          model: User,
          as: "author",
          attributes: ["username", "id", "spotifyDisplayName", "profileImage", "spotifyProfileImage", "avatarURL"],
        },
      ],
      order: [['createdAt', 'DESC']]
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

// Get posts if status === draft
router.get("/drafts", authenticateJWT, async (req, res) => {
  try {
    const drafts = await Posts.findAll({
      where: {
        userId: req.user.id,
        status: "draft",
      },
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'spotifyDisplayName', 'profileImage', 'spotifyProfileImage', 'avatarURL']
      }],
      order: [['createdAt', 'DESC']]
    });
    res.json(drafts);
  } catch (error) {
    console.error("Error fetching drafts:", error);
    res.status(500).json({ error: "Failed to fetch drafts" });
  }
});

// Get posts by the logged-in user
router.get("/mine", authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const posts = await Posts.findAll({
      where: { userId },
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'spotifyDisplayName', 'profileImage', 'spotifyProfileImage', 'avatarURL']
      }],
      order: [['createdAt', 'DESC']]
    });
    res.json(posts);
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

// Get posts if status === published
router.get("/published", authenticateJWT, async (req, res) => {
  try {
    const publishedPosts = await Posts.findAll({
      where: {
        userId: req.user.id,
        status: "published",
      },
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'spotifyDisplayName', 'profileImage', 'spotifyProfileImage', 'avatarURL']
      }],
      order: [['createdAt', 'DESC']]
    });
    res.json(publishedPosts);
  } catch (error) {
    console.error("Error fetching published posts:", error);
    res.status(500).json({ error: "Failed to fetch published posts" });
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
          attributes: ["username", "id", "spotifyDisplayName", "profileImage", "spotifyProfileImage", "avatarURL"],
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
    const { title, description, status, spotifyId, spotifyType, spotifyEmbedUrl, isPublic = true } = req.body;

    if (!title || title.trim() === '') {
      return res.status(400).json({ error: "Title is required" });
    }

    if (!description || description.trim() === '') {
      return res.status(400).json({ error: "Description is required" });
    }

    const postData = {
      title: title.trim(),
      description: description.trim(),
      status: status || 'published',
      userId: req.user.id,
      isPublic: isPublic
    };

    // Handle Spotify embed data
    if (spotifyId && spotifyType) {
      const validTypes = ['track', 'album', 'playlist', 'artist'];
      if (!validTypes.includes(spotifyType)) {
        return res.status(400).json({ error: "Invalid Spotify type" });
      }
      
      postData.spotifyId = spotifyId;
      postData.spotifyType = spotifyType;
      postData.spotifyEmbedUrl = spotifyEmbedUrl;
    }

    const newPost = await Posts.create(postData);
    
    // Fetch the created post with author info
    const postWithAuthor = await Posts.findByPk(newPost.id, {
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'spotifyDisplayName', 'profileImage', 'spotifyProfileImage', 'avatarURL']
      }]
    });

    res.status(201).json(postWithAuthor);
  } catch (error) {
    console.error("Error creating post:", error);
    res.status(500).json({ error: "Failed to create post" });
  }
});

// Create a draft post
router.post("/draft", authenticateJWT, async (req, res) => {
  try {
    const { title, description, spotifyId, spotifyType, spotifyEmbedUrl, isPublic = true } = req.body;

    if (!title || title.trim() === '') {
      return res.status(400).json({ error: "Title is required" });
    }

    const postData = {
      title: title.trim(),
      description: description || '',
      status: 'draft',
      userId: req.user.id,
      isPublic: isPublic
    };

    // Handle Spotify embed data
    if (spotifyId && spotifyType) {
      const validTypes = ['track', 'album', 'playlist', 'artist'];
      if (!validTypes.includes(spotifyType)) {
        return res.status(400).json({ error: "Invalid Spotify type" });
      }
      
      postData.spotifyId = spotifyId;
      postData.spotifyType = spotifyType;
      postData.spotifyEmbedUrl = spotifyEmbedUrl;
    }

    const newDraft = await Posts.create(postData);
    
    // Fetch the created draft with author info
    const draftWithAuthor = await Posts.findByPk(newDraft.id, {
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'spotifyDisplayName', 'profileImage', 'spotifyProfileImage', 'avatarURL']
      }]
    });

    res.status(201).json(draftWithAuthor);
  } catch (error) {
    console.error("Error creating draft:", error);
    res.status(500).json({ error: "Failed to create draft" });
  }
});

// PATCH api/posts/draft/:id ------ Update a draft endpoint
router.patch("/draft/:id", authenticateJWT, async (req, res) => {
  try {
    const { title, description, spotifyId, spotifyType, isPublic } = req.body;

    if (title !== undefined && !title.trim()) {
      return res.status(400).json({ error: "Title cannot be empty" });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description || '';
    if (spotifyId !== undefined) updateData.spotifyId = spotifyId || null;
    if (spotifyType !== undefined) {
      if (spotifyType && !['track', 'album', 'playlist', 'artist'].includes(spotifyType)) {
        return res.status(400).json({ error: "Invalid Spotify type" });
      }
      updateData.spotifyType = spotifyType || null;
    }
    if (isPublic !== undefined) updateData.isPublic = isPublic;

    const [updatedRowsCount] = await Posts.update(updateData, {
      where: {
        id: parseInt(req.params.id),
        userId: req.user.id,
        status: "draft",
      },
    });

    if (updatedRowsCount === 0) {
      return res.status(404).json({ error: "Draft post not found or unauthorized" });
    }

    // Fetch updated post with author info
    const updatedPost = await Posts.findByPk(req.params.id, {
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'spotifyDisplayName', 'profileImage', 'spotifyProfileImage', 'avatarURL']
      }]
    });

    res.json(updatedPost);
  } catch (error) {
    console.error("Error updating draft:", error);
    res.status(500).json({ error: "Failed to update draft" });
  }
});

// Publish a draft post
router.patch("/:id/publish", authenticateJWT, async (req, res) => {
  try {
    const [updatedRowsCount] = await Posts.update(
      { status: 'published' },
      {
        where: { 
          id: parseInt(req.params.id),
          userId: req.user.id,
          status: 'draft'
        }
      }
    );

    if (updatedRowsCount === 0) {
      return res.status(404).json({ error: "Draft post not found or unauthorized" });
    }

    // Fetch updated post with author info
    const publishedPost = await Posts.findByPk(req.params.id, {
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'spotifyDisplayName', 'profileImage', 'spotifyProfileImage', 'avatarURL']
      }]
    });

    res.json(publishedPost);
  } catch (error) {
    console.error("Error publishing post:", error);
    res.status(500).json({ error: "Failed to publish post" });
  }
});

// Like/Unlike a post
router.post("/:id/like", authenticateJWT, async (req, res) => {
  try {
    const post = await Posts.findByPk(req.params.id);
    
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Simple like increment (you can make this more sophisticated later)
    await post.increment('likesCount');
    await post.reload();
    
    res.json({ message: "Post liked", likesCount: post.likesCount });
  } catch (error) {
    console.error("Error liking post:", error);
    res.status(500).json({ error: "Failed to like post" });
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
    const post = await Posts.findByPk(postId);

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (post.userId !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized to delete this post" });
    }

    await post.destroy();
    res.json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({ error: "Failed to delete post" });
  }
});

module.exports = router;