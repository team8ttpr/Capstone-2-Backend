const express = require("express");
const axios = require("axios");
const { User } = require("../database");

const router = express.Router();

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// Import authenticateJWT middleware
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Define authenticateJWT middleware locally or import it properly
const authenticateJWT = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).send({ error: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).send({ error: "Invalid or expired token" });
    }
    req.user = user;
    next();
  });
};

// Generate Spotify authorization URL
router.get("/auth-url", (req, res) => {
  const scopes = [
    "user-read-private",
    "user-read-email",
    "user-top-read",
    "user-read-recently-played",
    "playlist-read-private",
    "playlist-read-collaborative"
  ].join(" ");

  // generate a random state string for CSRF protection
  const state = Math.random().toString(36).substring(2, 15);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: SPOTIFY_CLIENT_ID,
    scope: scopes,
    redirect_uri: `${FRONTEND_URL}/callback/spotify`,
    state: state,
  });

  const authUrl = `https://accounts.spotify.com/authorize?${params}`;
  res.json({ authUrl, state }); // Return state so frontend can store/verify it
});

// Handle Spotify callback
router.post("/callback", authenticateJWT, async (req, res) => {
  try {
    const { code, state } = req.body;

    // Verify state matches user ID
    if (state !== req.user.id.toString()) {
      return res.status(400).json({ error: "Invalid state parameter" });
    }

    // Exchange code for access token
    const tokenResponse = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: `${FRONTEND_URL}/callback/spotify`,
        client_id: SPOTIFY_CLIENT_ID,
        client_secret: SPOTIFY_CLIENT_SECRET,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    // Get user's Spotify profile
    const profileResponse = await axios.get("https://api.spotify.com/v1/me", {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const spotifyProfile = profileResponse.data;

    // Update user with Spotify data
    const user = await User.findByPk(req.user.id);
    await user.update({
      spotifyId: spotifyProfile.id,
      spotifyAccessToken: access_token,
      spotifyRefreshToken: refresh_token,
      spotifyTokenExpiresAt: new Date(Date.now() + expires_in * 1000),
      spotifyDisplayName: spotifyProfile.display_name,
      spotifyProfileImage: spotifyProfile.images?.[0]?.url || null,
    });

    res.json({
      message: "Spotify connected successfully",
      spotify: {
        id: spotifyProfile.id,
        displayName: spotifyProfile.display_name,
        profileImage: spotifyProfile.images?.[0]?.url,
      },
    });
  } catch (error) {
    console.error("Spotify callback error:", error);
    res.status(500).json({ error: "Failed to connect Spotify account" });
  }
});

// Get user's Spotify data
router.get("/profile", authenticateJWT, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user.spotifyId) {
      return res.json({ connected: false });
    }

    // Check if token needs refresh
    if (!user.isSpotifyTokenValid()) {
      return res.status(401).json({ error: "Spotify token expired" });
    }

    // Get current Spotify profile
    const profileResponse = await axios.get("https://api.spotify.com/v1/me", {
      headers: {
        Authorization: `Bearer ${user.spotifyAccessToken}`,
      },
    });

    res.json({
      connected: true,
      profile: profileResponse.data,
    });
  } catch (error) {
    console.error("Spotify profile error:", error);
    res.status(500).json({ error: "Failed to get Spotify profile" });
  }
});

// Get user's top tracks
router.get("/top-tracks", authenticateJWT, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user.spotifyAccessToken || !user.isSpotifyTokenValid()) {
      return res.status(401).json({ error: "Spotify not connected or token expired" });
    }

    const response = await axios.get("https://api.spotify.com/v1/me/top/tracks", {
      headers: {
        Authorization: `Bearer ${user.spotifyAccessToken}`,
      },
      params: {
        limit: 20,
        time_range: "medium_term",
      },
    });

    res.json(response.data);
  } catch (error) {
    console.error("Spotify top tracks error:", error);
    res.status(500).json({ error: "Failed to get top tracks" });
  }
});

// Disconnect Spotify
router.delete("/disconnect", authenticateJWT, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    await user.update({
      spotifyId: null,
      spotifyAccessToken: null,
      spotifyRefreshToken: null,
      spotifyTokenExpiresAt: null,
      spotifyDisplayName: null,
      spotifyProfileImage: null,
    });

    res.json({ message: "Spotify disconnected successfully" });
  } catch (error) {
    console.error("Spotify disconnect error:", error);
    res.status(500).json({ error: "Failed to disconnect Spotify" });
  }
});

module.exports = router;