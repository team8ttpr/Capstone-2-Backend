const express = require("express");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const { User } = require("../database");
const { authenticateJWT } = require("./index");

const router = express.Router();

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://127.0.0.1:3000";
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

const cookieSettings = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 24 * 60 * 60 * 1000,
  path: "/",
};

const refreshSpotifyToken = async (user) => {
  try {
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: user.spotifyRefreshToken,
        client_id: SPOTIFY_CLIENT_ID,
        client_secret: SPOTIFY_CLIENT_SECRET,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const { access_token, expires_in } = response.data;
    
    await user.update({
      spotifyAccessToken: access_token,
      spotifyTokenExpiresAt: new Date(Date.now() + expires_in * 1000),
    });

    return access_token;
  } catch (error) {
    console.error("Failed to refresh Spotify token:", error.message);
    throw new Error("Token refresh failed");
  }
};

const getValidSpotifyToken = async (user) => {
  if (!user.spotifyAccessToken) {
    throw new Error("Spotify not connected");
  }

  if (user.isSpotifyTokenValid()) {
    return user.spotifyAccessToken;
  }

  if (!user.spotifyRefreshToken) {
    throw new Error("Spotify not connected");
  }

  return await refreshSpotifyToken(user);
};

const generateUsername = async (spotifyProfile) => {
  let baseUsername = spotifyProfile.display_name || spotifyProfile.id || 'spotify_user';
  
  baseUsername = baseUsername
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .substring(0, 15)
    .toLowerCase();

  if (baseUsername.length < 3) {
    baseUsername = `spotify_${spotifyProfile.id.substring(0, 10)}`;
  }

  if (baseUsername.length > 20) {
    baseUsername = baseUsername.substring(0, 20);
  }

  let finalUsername = baseUsername;
  let counter = 1;
  
  while (await User.findOne({ where: { username: finalUsername } })) {
    const suffix = `_${counter}`;
    const maxLength = 20 - suffix.length;
    finalUsername = baseUsername.substring(0, maxLength) + suffix;
    counter++;
    
    if (counter > 1000) {
      finalUsername = `spotify_${Date.now()}`.substring(0, 20);
      break;
    }
  }

  return finalUsername;
};

// Login URL endpoint
router.get("/login-url", (req, res) => {
  try {
    const scopes = [
      'user-read-private',
      'user-read-email',
      'user-top-read',
      'user-read-recently-played',
      'playlist-read-private',
      'playlist-read-collaborative'
    ].join(' ');

    const authUrl = 'https://accounts.spotify.com/authorize?' + 
      new URLSearchParams({
        response_type: 'code',
        client_id: SPOTIFY_CLIENT_ID,
        scope: scopes,
        redirect_uri: `${FRONTEND_URL}/callback/spotify`,
        state: 'spotify_login',
        show_dialog: true
      });

    res.json({ authUrl });
  } catch (error) {
    console.error("Error generating Spotify login URL:", error.message);
    res.status(500).json({ error: "Failed to generate Spotify login URL" });
  }
});

// Auth URL for connected users
router.get("/auth-url", authenticateJWT, (req, res) => {
  try {
    const scopes = [
      'user-read-private',
      'user-read-email',
      'user-top-read',
      'user-read-recently-played',
      'playlist-read-private',
      'playlist-read-collaborative'
    ].join(' ');

    const authUrl = 'https://accounts.spotify.com/authorize?' + 
      new URLSearchParams({
        response_type: 'code',
        client_id: SPOTIFY_CLIENT_ID,
        scope: scopes,
        redirect_uri: `${FRONTEND_URL}/callback/spotify`,
        state: req.user.id.toString(),
        show_dialog: true
      });

    res.json({ authUrl });
  } catch (error) {
    console.error("Error generating Spotify auth URL:", error.message);
    res.status(500).json({ error: "Failed to generate auth URL" });
  }
});

// Spotify login endpoint
router.post("/login", async (req, res) => {
  try {
    const { code, state } = req.body;

    if (state !== "spotify_login") {
      return res.status(400).json({ error: "Invalid state parameter" });
    }

    if (!code) {
      return res.status(400).json({ error: "No authorization code provided" });
    }

    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
      return res.status(500).json({ error: "Server configuration error" });
    }

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

    const profileResponse = await axios.get("https://api.spotify.com/v1/me", {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const spotifyProfile = profileResponse.data;

    let user = await User.findOne({ where: { spotifyId: spotifyProfile.id } });

    if (!user) {
      try {
        const username = await generateUsername(spotifyProfile);

        if (username.length < 3 || username.length > 20) {
          throw new Error(`Invalid username length: ${username.length}`);
        }

        const userData = {
          username: username,
          email: spotifyProfile.email || null,
          spotifyId: spotifyProfile.id,
          spotifyAccessToken: access_token,
          spotifyRefreshToken: refresh_token,
          spotifyTokenExpiresAt: new Date(Date.now() + expires_in * 1000),
          spotifyDisplayName: spotifyProfile.display_name || null,
          spotifyProfileImage: spotifyProfile.images?.[0]?.url || null,
          passwordHash: null,
        };

        user = await User.create(userData);
      } catch (validationError) {
        if (validationError.name === 'SequelizeValidationError') {
          const errorMessages = validationError.errors.map(err => err.message);
          return res.status(400).json({ 
            error: "User validation failed", 
            details: errorMessages.join(', ')
          });
        }
        
        if (validationError.name === 'SequelizeUniqueConstraintError') {
          return res.status(400).json({ 
            error: "User already exists with this data", 
            details: validationError.message 
          });
        }
        
        throw validationError;
      }
    } else {
      await user.update({
        spotifyAccessToken: access_token,
        spotifyRefreshToken: refresh_token,
        spotifyTokenExpiresAt: new Date(Date.now() + expires_in * 1000),
        spotifyDisplayName: spotifyProfile.display_name || user.spotifyDisplayName,
        spotifyProfileImage: spotifyProfile.images?.[0]?.url || user.spotifyProfileImage,
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        auth0Id: user.auth0Id,
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.cookie("token", token, cookieSettings);
    
    res.json({
      message: "Spotify login successful",
      token: token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Spotify login error:", error.message);
    
    if (error.response?.status === 400) {
      return res.status(400).json({ 
        error: "Invalid authorization code or expired",
        details: error.response?.data 
      });
    }
    
    res.status(500).json({ 
      error: "Failed to login with Spotify",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Spotify callback for connected users
router.post("/callback", authenticateJWT, async (req, res) => {
  try {
    const { code, state } = req.body;
    const userId = parseInt(state);

    if (userId !== req.user.id) {
      return res.status(400).json({ error: "Invalid state parameter" });
    }

    if (!code) {
      return res.status(400).json({ error: "No authorization code provided" });
    }

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

    const profileResponse = await axios.get("https://api.spotify.com/v1/me", {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const spotifyProfile = profileResponse.data;

    const user = await User.findByPk(req.user.id);
    await user.update({
      spotifyId: spotifyProfile.id,
      spotifyAccessToken: access_token,
      spotifyRefreshToken: refresh_token,
      spotifyTokenExpiresAt: new Date(Date.now() + expires_in * 1000),
      spotifyDisplayName: spotifyProfile.display_name,
      spotifyProfileImage: spotifyProfile.images?.[0]?.url || null,
    });

    res.json({ message: "Spotify connected successfully" });
  } catch (error) {
    console.error("Spotify callback error:", error.message);
    res.status(500).json({ error: "Failed to connect Spotify" });
  }
});

// Get Spotify profile
router.get("/profile", authenticateJWT, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    
    if (!user.spotifyId) {
      return res.json({ connected: false });
    }

    res.json({
      connected: true,
      profile: {
        id: user.spotifyId,
        display_name: user.spotifyDisplayName,
        images: user.spotifyProfileImage ? [{ url: user.spotifyProfileImage }] : [],
      },
    });
  } catch (error) {
    console.error("Error getting Spotify profile:", error.message);
    res.status(500).json({ error: "Failed to get profile" });
  }
});

// Get top tracks
router.get("/top-tracks", authenticateJWT, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    const accessToken = await getValidSpotifyToken(user);
    const timeRange = req.query.time_range || "short_term";

    const response = await axios.get("https://api.spotify.com/v1/me/top/tracks", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      params: {
        limit: 20,
        time_range: timeRange,
      },
    });

    res.json(response.data);
  } catch (error) {
    if (error.message === "Spotify not connected") {
      return res.status(401).json({ error: "Spotify not connected" });
    }
    console.error("Error getting top tracks:", error.message);
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
    console.error("Error disconnecting Spotify:", error.message);
    res.status(500).json({ error: "Failed to disconnect Spotify" });
  }
});

module.exports = router;