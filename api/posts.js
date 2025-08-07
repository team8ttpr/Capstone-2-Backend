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
        attributes: ['id', 'username', 'spotifyDisplayName', 'profileImage', 'spotifyProfileImage']
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

// Get all posts by the logged-in user
router.get("/", authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const posts = await Posts.findAll({
      where: { userId },
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'spotifyDisplayName', 'profileImage', 'spotifyProfileImage']
      }],
      order: [['createdAt', 'DESC']]
    });
    res.json(posts);
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

// Create a new published post
router.post("/", authenticateJWT, async (req, res) => {
  try {
    const { title, description, spotifyId, spotifyType, embedData, isPublic = true } = req.body;

    if (!title || title.trim() === '') {
      return res.status(400).json({ error: "Title is required" });
    }

    if (!description || description.trim() === '') {
      return res.status(400).json({ error: "Description is required" });
    }

    const postData = {
      title: title.trim(),
      description: description.trim(),
      status: 'published',
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
    }

    const newPost = await Posts.create(postData);
    
    // Fetch the created post with author info
    const postWithAuthor = await Posts.findByPk(newPost.id, {
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'spotifyDisplayName', 'profileImage', 'spotifyProfileImage']
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
    const { title, description, spotifyId, spotifyType, embedData, isPublic = true } = req.body;

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
    }

    const newDraft = await Posts.create(postData);
    
    // Fetch the created draft with author info
    const draftWithAuthor = await Posts.findByPk(newDraft.id, {
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'spotifyDisplayName', 'profileImage', 'spotifyProfileImage']
      }]
    });

    res.status(201).json(draftWithAuthor);
  } catch (error) {
    console.error("Error creating draft:", error);
    res.status(500).json({ error: "Failed to create draft" });
  }
});

// Update a draft post
router.patch("/draft/:id", authenticateJWT, async (req, res) => {
  try {
    const { title, description, spotifyId, spotifyType, embedData, isPublic } = req.body;
    
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
        status: 'draft'
      }
    });

    if (updatedRowsCount === 0) {
      return res.status(404).json({ error: "Draft post not found or unauthorized" });
    }

    // Fetch updated post with author info
    const updatedPost = await Posts.findByPk(req.params.id, {
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'spotifyDisplayName', 'profileImage', 'spotifyProfileImage']
      }]
    });

    res.json(updatedPost);

  } catch (error) {
    console.error("Error updating draft:", error);
    res.status(500).json({ error: "Failed to update draft" });
  }
});

// Like a post
router.post("/:id/like", authenticateJWT, async (req, res) => {
  try {
    const post = await Posts.findByPk(req.params.id);
    
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Simple like increment (you can make this more sophisticated later)
    await post.increment('likesCount');
    
    res.json({ message: "Post liked", likesCount: post.likesCount + 1 });

  } catch (error) {
    console.error("Error liking post:", error);
    res.status(500).json({ error: "Failed to like post" });
  }
});

module.exports = router;