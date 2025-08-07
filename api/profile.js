const express = require("express");
const router = express.Router();
const { User, Posts, Follows } = require("../database");
const { authenticateJWT } = require("../auth");

// Get current user's profile
router.get("/me", authenticateJWT, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: [
        'id', 'username', 'email', 'firstName', 'lastName', 'bio', 
        'profileImage', 'spotifyDisplayName', 'spotifyProfileImage',
        'createdAt'
      ]
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const postCount = await Posts.count({
      where: { userId: user.id, status: 'published' }
    });

    const followersCount = await Follows.count({
      where: { followingId: user.id }
    });

    const followingCount = await Follows.count({
      where: { followerId: user.id }
    });

    res.json({
      ...user.toJSON(),
      stats: {
        posts: postCount,
        followers: followersCount,
        following: followingCount
      }
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// Get user's posts
router.get("/me/posts", authenticateJWT, async (req, res) => {
  try {
    const posts = await Posts.findAll({
      where: { 
        userId: req.user.id,
        status: 'published'
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
    console.error("Error fetching user posts:", error);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

// Update current user's profile
router.patch("/me", authenticateJWT, async (req, res) => {
  try {
    const { firstName, lastName, bio, profileImage } = req.body;
    
    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName || null;
    if (lastName !== undefined) updateData.lastName = lastName || null;
    if (bio !== undefined) updateData.bio = bio || null;
    if (profileImage !== undefined) updateData.profileImage = profileImage || null;

    const [updatedRowsCount] = await User.update(updateData, {
      where: { id: req.user.id }
    });

    if (updatedRowsCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    // Fetch updated user
    const updatedUser = await User.findByPk(req.user.id, {
      attributes: [
        'id', 'username', 'email', 'firstName', 'lastName', 'bio', 
        'profileImage', 'spotifyDisplayName', 'spotifyProfileImage',
        'createdAt'
      ]
    });

    res.json(updatedUser);
  } catch (error) {
    console.error("Error updating profile:", error);
    
    if (error.name === 'SequelizeValidationError') {
      const errorMessages = error.errors.map(err => err.message);
      return res.status(400).json({ 
        error: "Validation failed", 
        details: errorMessages.join(', ')
      });
    }
    
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// Get public profile by username
router.get("/:username", async (req, res) => {
  try {
    const user = await User.findOne({
      where: { username: req.params.username },
      attributes: [
        'id', 'username', 'firstName', 'lastName', 'bio', 
        'profileImage', 'spotifyDisplayName', 'spotifyProfileImage',
        'createdAt'
      ]
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get post count
    const postCount = await Posts.count({
      where: { userId: user.id, status: 'published' }
    });

    // Get followers count
    const followersCount = await Follows.count({
      where: { followingId: user.id }
    });

    // Get following count
    const followingCount = await Follows.count({
      where: { followerId: user.id }
    });

    res.json({
      ...user.toJSON(),
      stats: {
        posts: postCount,
        followers: followersCount,
        following: followingCount
      }
    });
  } catch (error) {
    console.error("Error fetching public profile:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// Get public user's posts
router.get("/:username/posts", async (req, res) => {
  try {
    const user = await User.findOne({
      where: { username: req.params.username }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const posts = await Posts.findAll({
      where: { 
        userId: user.id,
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
    console.error("Error fetching user posts:", error);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

// Follow/unfollow user
router.post("/:username/follow", authenticateJWT, async (req, res) => {
  try {
    const userToFollow = await User.findOne({
      where: { username: req.params.username }
    });

    if (!userToFollow) {
      return res.status(404).json({ error: "User not found" });
    }

    if (userToFollow.id === req.user.id) {
      return res.status(400).json({ error: "Cannot follow yourself" });
    }

    // Check if already following
    const existingFollow = await Follows.findOne({
      where: {
        followerId: req.user.id,
        followingId: userToFollow.id
      }
    });

    if (existingFollow) {
      // Unfollow
      await existingFollow.destroy();
      res.json({ message: "Unfollowed successfully", following: false });
    } else {
      // Follow
      await Follows.create({
        followerId: req.user.id,
        followingId: userToFollow.id
      });
      res.json({ message: "Followed successfully", following: true });
    }
  } catch (error) {
    console.error("Error following/unfollowing user:", error);
    res.status(500).json({ error: "Failed to follow/unfollow user" });
  }
});

// Check if current user is following another user
router.get("/:username/following-status", authenticateJWT, async (req, res) => {
  try {
    const userToCheck = await User.findOne({
      where: { username: req.params.username }
    });

    if (!userToCheck) {
      return res.status(404).json({ error: "User not found" });
    }

    const isFollowing = await Follows.findOne({
      where: {
        followerId: req.user.id,
        followingId: userToCheck.id
      }
    });

    res.json({ following: !!isFollowing });
  } catch (error) {
    console.error("Error checking following status:", error);
    res.status(500).json({ error: "Failed to check following status" });
  }
});

module.exports = router;