const express = require("express");
const router = express.Router();
const { User } = require("../database");
const { authenticateJWT } = require("../auth");

// get current logged-in user information
router.get("/profile", authenticateJWT, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: [
        "id", 
        "username", 
        "email", 
        "spotifyId",
        "spotifyDisplayName",
        "spotifyProfileImage",
        "createdAt", 
        "updatedAt"
      ]
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Build response with user info
    const userProfile = {
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      spotify: {
        connected: !!user.spotifyId,
        displayName: user.spotifyDisplayName || null,
        profileImage: user.spotifyProfileImage || null
      }
    };

    res.json(userProfile);

  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
});

// Update user profile 
router.patch("/profile", authenticateJWT, async (req, res) => {
  try {
    const { username, email } = req.body;
    
    // Build update object with only provided fields
    const updateData = {};
    if (username !== undefined) {
      if (!username || username.trim().length < 3) {
        return res.status(400).json({ error: "Username must be at least 3 characters long" });
      }
      updateData.username = username.trim();
    }
    
    if (email !== undefined) {
      if (!email || !email.includes('@')) {
        return res.status(400).json({ error: "Valid email is required" });
      }
      updateData.email = email.trim();
    }

    // Check if no fields to update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "No valid fields provided for update" });
    }

    // Update the user
    const [updatedRowsCount] = await User.update(updateData, {
      where: { id: req.user.id }
    });

    if (updatedRowsCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get updated user info to return
    const updatedUser = await User.findByPk(req.user.id, {
      attributes: [
        "id", 
        "username", 
        "email", 
        "spotifyId",
        "spotifyDisplayName",
        "spotifyProfileImage",
        "createdAt", 
        "updatedAt"
      ]
    });

    // Build response with updated user info
    const userProfile = {
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
      spotify: {
        connected: !!updatedUser.spotifyId,
        displayName: updatedUser.spotifyDisplayName || null,
        profileImage: updatedUser.spotifyProfileImage || null
      }
    };

    res.json({
      message: "Profile updated successfully",
      user: userProfile
    });

  } catch (error) {
    // Handle unique constraint errors (duplicate username/email)
    if (error.name === 'SequelizeUniqueConstraintError') {
      const field = error.errors[0].path;
      return res.status(400).json({ 
        error: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists` 
      });
    }
    
    console.error("Error updating user profile:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

module.exports = router;
