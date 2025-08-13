const express = require("express");
const router = express.Router();
const { User, Posts, Follows } = require("../database");
const { authenticateJWT } = require("../auth");
const { Op } = require("sequelize");
const multer = require('multer');
const path = require('path');
const { uploadSticker, cloudinary } = require('../config/cloudinary');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
});

// Get current user's profile
router.get("/me", authenticateJWT, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: [
        'id', 'username', 'email', 'firstName', 'lastName', 'bio', 
        'profileImage', 'wallpaperURL', 'spotifyDisplayName', 'spotifyProfileImage',
        'avatarURL', 'profileTheme', 'createdAt', 'spotifyItems',
        'showPosts', 'showUsername', 'showDateJoined', 'showSpotifyStatus'
      ]
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get post count
    const postCount = await Posts.count({
      where: { userId: user.id, status: "published" },
    });

    // Get followers count
    const followersCount = await Follows.count({
      where: { followingId: user.id },
    });

    // Get following count
    const followingCount = await Follows.count({
      where: { followerId: user.id },
    });

    res.json({
      ...user.toJSON(),
      stats: {
        posts: postCount,
        followers: followersCount,
        following: followingCount,
      },
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
        status: "published",
      },
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
      order: [["createdAt", "DESC"]],
      limit: 20,
    });

    res.json(posts);
  } catch (error) {
    console.error("Error fetching user posts:", error);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

// GET all users beside logged in user
router.get("/all", authenticateJWT, async (req, res) => {
  try {
    let where = {
      id: { [Op.ne]: req.user.id },
    };
    // If user is authenticated, exclude their own user
    if (req.user && req.user.id) {
      where.id = { [Op.ne]: req.user.id };
    }
    const users = await User.findAll({
      where,
      attributes: [
        "id",
        "username",
        "email",
        "firstName",
        "lastName",
        "bio",
        "profileImage",
        "spotifyDisplayName",
        "spotifyProfileImage",
        "avatarURL",
        "profileTheme",
        "createdAt",
        "spotifyItems",
      ],
    });
    res.json(users);
  } catch (error) {
    console.error("Error fetching all users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Update current user's profile
router.patch("/me", authenticateJWT, async (req, res) => {
  try {
    const { firstName, lastName, bio, profileImage, wallpaperURL, profileTheme, showPosts, showUsername, showDateJoined, showSpotifyStatus } = req.body;
    
    // Validate data
    const updateData = {};

    if (firstName !== undefined) {
      if (firstName && firstName.length > 50) {
        return res
          .status(400)
          .json({ error: "First name must be 50 characters or less" });
      }
      updateData.firstName = firstName || null;
    }

    if (lastName !== undefined) {
      if (lastName && lastName.length > 50) {
        return res
          .status(400)
          .json({ error: "Last name must be 50 characters or less" });
      }
      updateData.lastName = lastName || null;
    }

    if (bio !== undefined) {
      if (bio && bio.length > 500) {
        return res
          .status(400)
          .json({ error: "Bio must be 500 characters or less" });
      }
      updateData.bio = bio || null;
    }

    if (profileImage !== undefined) {
      // Basic URL validation
      if (profileImage && !profileImage.match(/^https?:\/\/.+/)) {
        return res
          .status(400)
          .json({ error: "Profile image must be a valid URL" });
      }
      updateData.profileImage = profileImage || null;
    }

    if (wallpaperURL !== undefined) {
      // Basic URL validation
      if (wallpaperURL && !wallpaperURL.match(/^https?:\/\/.+/)) {
        return res.status(400).json({ error: "Wallpaper URL must be a valid URL" });
      }
      updateData.wallpaperURL = wallpaperURL || null;
    }

    if (profileTheme !== undefined) {
      // allow any reasonable string
      if (
        profileTheme &&
        (typeof profileTheme !== "string" || profileTheme.length > 50)
      ) {
        return res
          .status(400)
          .json({ error: "Theme must be a string of 50 characters or less" });
      }
      updateData.profileTheme = profileTheme || "default";
    }
//for visibikity settings
    if (showPosts !== undefined) {
      if (typeof showPosts !== 'boolean') {
        return res.status(400).json({ error: "showPosts must be a boolean" });
      }
      updateData.showPosts = showPosts;
    }
    if (showUsername !== undefined) {
      if (typeof showUsername !== 'boolean') {
        return res.status(400).json({ error: "showUsername must be a boolean" });
      }
      updateData.showUsername = showUsername;
    }
    if (showDateJoined !== undefined) {
      if (typeof showDateJoined !== 'boolean') {
        return res.status(400).json({ error: "showDateJoined must be a boolean" });
      }
      updateData.showDateJoined = showDateJoined;
    }
    if (showSpotifyStatus !== undefined) {
      if (typeof showSpotifyStatus !== 'boolean') {
        return res.status(400).json({ error: "showSpotifyStatus must be a boolean" });
      }
      updateData.showSpotifyStatus = showSpotifyStatus;
    }
//for visibikity settings
    if (showPosts !== undefined) {
      if (typeof showPosts !== 'boolean') {
        return res.status(400).json({ error: "showPosts must be a boolean" });
      }
      updateData.showPosts = showPosts;
    }
    if (showUsername !== undefined) {
      if (typeof showUsername !== 'boolean') {
        return res.status(400).json({ error: "showUsername must be a boolean" });
      }
      updateData.showUsername = showUsername;
    }
    if (showDateJoined !== undefined) {
      if (typeof showDateJoined !== 'boolean') {
        return res.status(400).json({ error: "showDateJoined must be a boolean" });
      }
      updateData.showDateJoined = showDateJoined;
    }
    if (showSpotifyStatus !== undefined) {
      if (typeof showSpotifyStatus !== 'boolean') {
        return res.status(400).json({ error: "showSpotifyStatus must be a boolean" });
      }
      updateData.showSpotifyStatus = showSpotifyStatus;
    }

    const [updatedRowsCount] = await User.update(updateData, {
      where: { id: req.user.id },
      validate: false,
    });

    if (updatedRowsCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    // Fetch updated user
    const updatedUser = await User.findByPk(req.user.id, {
      attributes: [
        'id', 'username', 'email', 'firstName', 'lastName', 'bio', 
        'profileImage', 'wallpaperURL', 'spotifyDisplayName', 'spotifyProfileImage',
        'avatarURL', 'profileTheme', 'createdAt',
        'showPosts', 'showUsername', 'showDateJoined', 'showSpotifyStatus'
      ]
    });

    res.json(updatedUser.toJSON());
  } catch (error) {
    console.error("Error updating profile:", error);

    if (error.name === "SequelizeValidationError") {
      const errorMessages = error.errors.map((err) => err.message);
      return res.status(400).json({
        error: "Validation failed",
        details: errorMessages.join(", "),
      });
    }

    res.status(500).json({ error: "Failed to update profile" });
  }
});

// Update current user's Spotify items
router.patch("/spotify-items", authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const items = req.body;
    if (!Array.isArray(items) || items.length > 5) {
      return res
        .status(400)
        .json({ error: "spotifyItems must be an array of up to 5 items." });
    }
    await User.update({ spotifyItems: items }, { where: { id: userId } });
    const updatedUser = await User.findByPk(userId, {
      attributes: [
        "id",
        "username",
        "email",
        "firstName",
        "lastName",
        "bio",
        "profileImage",
        "spotifyDisplayName",
        "spotifyProfileImage",
        "avatarURL",
        "profileTheme",
        "createdAt",
        "spotifyItems",
      ],
    });
    res.json({
      message: "Spotify items updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating spotifyItems:", error);
    res.status(500).json({ error: "Failed to update spotifyItems" });
  }
});

// Get current user's theme
router.get("/me/theme", authenticateJWT, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ["profileTheme"],
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      theme: user.profileTheme || "default",
      message: "Theme retrieved successfully",
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
      "default",
      "ocean",
      "sunset",
      "purple",
      "forest",
      "rose",
      "sakura",
      "lavender",
      "peach",
      "mint",
      "cotton",
      "sky",
      "shadow",
      "crimson",
      "neon",
      "void",
      "electric",
    ];

    const themeCategories = {
      original: ["default", "ocean", "sunset", "purple", "forest", "rose"],
      pastel: ["sakura", "lavender", "peach", "mint", "cotton", "sky"],
      dark: ["shadow", "crimson", "neon", "void", "electric"],
    };

    res.json({
      themes: themes,
      categories: themeCategories,
      total: themes.length,
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
        'profileImage', 'wallpaperURL', 'spotifyDisplayName', 'spotifyProfileImage',
        'avatarURL', 'profileTheme', 'createdAt', 'spotifyItems',
        'showPosts', 'showUsername', 'showDateJoined', 'showSpotifyStatus'
      ]
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get post count
    const postCount = await Posts.count({
      where: { userId: user.id, status: "published", isPublic: true },
    });

    // Get followers count
    const followersCount = await Follows.count({
      where: { followingId: user.id },
    });

    // Get following count
    const followingCount = await Follows.count({
      where: { followerId: user.id },
    });

    res.json({
      ...user.toJSON(),
      stats: {
        posts: postCount,
        followers: followersCount,
        following: followingCount,
      },
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
      where: { username: req.params.username },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const posts = await Posts.findAll({
      where: {
        userId: user.id,
        status: "published",
        isPublic: true,
      },
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
      order: [["createdAt", "DESC"]],
      limit: 20,
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
      where: { username: req.params.username },
    });

    if (!userToFollow) {
      return res.status(404).json({ error: "User not found" });
    }

    if (userToFollow.id === req.user.id) {
      return res.status(400).json({ error: "You cannot follow yourself" });
    }

    const existingFollow = await Follows.findOne({
      where: {
        followerId: req.user.id,
        followingId: userToFollow.id,
      },
    });

    if (existingFollow) {
      // Unfollow
      await Follows.destroy({
        where: {
          followerId: req.user.id,
          followingId: userToFollow.id,
        },
      });
      return res.json({ message: "Unfollowed successfully" });
    } else {
      // Follow
      await Follows.create({
        followerId: req.user.id,
        followingId: userToFollow.id,
      });
      return res.json({ message: "Followed successfully" });
    }
  } catch (error) {
    console.error("Error following/unfollowing user:", error);
    res.status(500).json({ error: "Failed to follow/unfollow user" });
  }
});

//Search all user
router.get("/search", authenticateJWT, async (req, res) => {
  console.log(
    "[/api/profile/search] query:",
    req.query.q,
    "user:",
    req.user?.id
  );
  try {
    const q = (req.query.q || "").trim();
    const meId = req.user.id;
    const { Op } = require("sequelize");

    const where = {
      id: { [Op.ne]: meId },
    };
    if (q) {
      where.username = { [Op.iLike]: `%${q}%` };
    }

    const users = await User.findAll({
      where,
      attributes: ["id", "username", "email"],
    });

    res.json(users);
  } catch (err) {
    console.error("Error searching users:", err);
    res.status(500).json({ error: "Failed to search users" });
  }
});

// upload wallpaper or profile picture to Cloudinary (In Use folder)
router.post('/upload', authenticateJWT, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const type = req.body.type === 'wallpaper' ? 'Wallpaper' : 'Profile Picture';
    const folder = `TTP-Capstone 2/In Use/${type}`;
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
          transformation: [
            { quality: 'auto', fetch_format: 'auto' },
            type === 'Profile Picture' ? { width: 500, height: 500, crop: 'limit' } : { width: 1920, height: 1080, crop: 'limit' }
          ]
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });
    res.json({ url: uploadResult.secure_url, publicId: uploadResult.public_id });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

module.exports = router;