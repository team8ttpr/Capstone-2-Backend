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
        'avatarURL', 'profileTheme', 'createdAt'
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
    console.error("Error fetching profile:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// Get current user's posts
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
        attributes: ['id', 'username', 'spotifyDisplayName', 'profileImage', 'spotifyProfileImage', 'avatarURL']
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
    const { firstName, lastName, bio, profileImage, profileTheme } = req.body;
    
    // Validate data
    const updateData = {};
    
    if (firstName !== undefined) {
      if (firstName && firstName.length > 50) {
        return res.status(400).json({ error: "First name must be 50 characters or less" });
      }
      updateData.firstName = firstName || null;
    }
    
    if (lastName !== undefined) {
      if (lastName && lastName.length > 50) {
        return res.status(400).json({ error: "Last name must be 50 characters or less" });
      }
      updateData.lastName = lastName || null;
    }
    
    if (bio !== undefined) {
      if (bio && bio.length > 500) {
        return res.status(400).json({ error: "Bio must be 500 characters or less" });
      }
      updateData.bio = bio || null;
    }
    
    if (profileImage !== undefined) {
      // Basic URL validation
      if (profileImage && !profileImage.match(/^https?:\/\/.+/)) {
        return res.status(400).json({ error: "Profile image must be a valid URL" });
      }
      updateData.profileImage = profileImage || null;
    }

    if (profileTheme !== undefined) {
      const validThemes = [
        'default', 'ocean', 'sunset', 'purple', 'forest', 'rose',
        'sakura', 'lavender', 'peach', 'mint', 'cotton', 'sky',
        'shadow', 'crimson', 'neon', 'void', 'electric'
      ];
      
      if (profileTheme && !validThemes.includes(profileTheme)) {
        return res.status(400).json({ error: "Invalid theme selection" });
      }
      updateData.profileTheme = profileTheme || 'default';
    }

    const [updatedRowsCount] = await User.update(updateData, {
      where: { id: req.user.id },
      validate: false 
    });

    if (updatedRowsCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    // Fetch updated user
    const updatedUser = await User.findByPk(req.user.id, {
      attributes: [
        'id', 'username', 'email', 'firstName', 'lastName', 'bio', 
        'profileImage', 'spotifyDisplayName', 'spotifyProfileImage',
        'avatarURL', 'profileTheme', 'createdAt'
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

// Get current user's theme
router.get("/me/theme", authenticateJWT, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['profileTheme']
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ 
      theme: user.profileTheme || 'default',
      message: "Theme retrieved successfully"
    });
  } catch (error) {
    console.error("Error fetching user theme:", error);
    res.status(500).json({ error: "Failed to fetch theme" });
  }
});

// get available themes
router.get("/themes", async (req, res) => {
  try {
    const themes = [
      'default', 'ocean', 'sunset', 'purple', 'forest', 'rose',
      'sakura', 'lavender', 'peach', 'mint', 'cotton', 'sky',
      'shadow', 'crimson', 'neon', 'void', 'electric'
    ];

    const themeCategories = {
      original: ['default', 'ocean', 'sunset', 'purple', 'forest', 'rose'],
      pastel: ['sakura', 'lavender', 'peach', 'mint', 'cotton', 'sky'],
      dark: ['shadow', 'crimson', 'neon', 'void', 'electric']
    };

    res.json({
      themes: themes,
      categories: themeCategories,
      total: themes.length
    });
  } catch (error) {
    console.error("Error fetching themes:", error);
    res.status(500).json({ error: "Failed to fetch themes" });
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
        'avatarURL', 'profileTheme', 'createdAt'
      ]
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get post count
    const postCount = await Posts.count({
      where: { userId: user.id, status: 'published', isPublic: true }
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
        attributes: ['id', 'username', 'spotifyDisplayName', 'profileImage', 'spotifyProfileImage', 'avatarURL']
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

// Get user's followers
router.get("/:username/followers", async (req, res) => {
  try {
    const user = await User.findOne({
      where: { username: req.params.username }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const followers = await Follows.findAll({
      where: { followingId: user.id },
      include: [{
        model: User,
        as: 'follower',
        attributes: ['id', 'username', 'firstName', 'lastName', 'profileImage', 'spotifyProfileImage', 'avatarURL']
      }],
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    res.json(followers.map(follow => follow.follower));
  } catch (error) {
    console.error("Error fetching followers:", error);
    res.status(500).json({ error: "Failed to fetch followers" });
  }
});

// Get user's following
router.get("/:username/following", async (req, res) => {
  try {
    const user = await User.findOne({
      where: { username: req.params.username }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const following = await Follows.findAll({
      where: { followerId: user.id },
      include: [{
        model: User,
        as: 'following',
        attributes: ['id', 'username', 'firstName', 'lastName', 'profileImage', 'spotifyProfileImage', 'avatarURL']
      }],
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    res.json(following.map(follow => follow.following));
  } catch (error) {
    console.error("Error fetching following:", error);
    res.status(500).json({ error: "Failed to fetch following" });
  }
});

module.exports = router;