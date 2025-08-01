const express = require("express");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const { User } = require("../database");
const { authenticateJWT } = require("./index");

const router = express.Router();

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
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

    const { access_token, expires_in, refresh_token } = response.data;

    await user.update({
      spotifyAccessToken: access_token,
      spotifyTokenExpiresAt: new Date(Date.now() + expires_in * 1000),
      spotifyRefreshToken: refresh_token || user.spotifyRefreshToken,
    });

    return access_token;
  } catch (error) {
    throw error;
  }
};

const getValidSpotifyToken = async (user) => {
  if (!user.spotifyAccessToken || !user.spotifyRefreshToken) {
    throw new Error("Spotify not connected");
  }

  if (user.isSpotifyTokenValid()) {
    return user.spotifyAccessToken;
  }

  return await refreshSpotifyToken(user);
};

// Generate safe username from Spotify data
const generateUsername = async (spotifyProfile) => {
  let baseUsername = spotifyProfile.display_name || spotifyProfile.id || 'spotify_user';
  
  // Clean username - remove invalid characters and limit length
  baseUsername = baseUsername
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .substring(0, 15)
    .toLowerCase();

  // Ensure minimum length
  if (baseUsername.length < 3) {
    baseUsername = `spotify_${spotifyProfile.id}`.substring(0, 20);
  }

  // Check for uniqueness and modify if needed
  let finalUsername = baseUsername;
  let counter = 1;
  
  while (await User.findOne({ where: { username: finalUsername } })) {
    finalUsername = `${baseUsername}_${counter}`;
    counter++;
    
    // Prevent infinite loop
    if (counter > 1000) {
      finalUsername = `spotify_${Date.now()}`;
      break;
    }
  }

  return finalUsername;
};

router.get("/login-url", (req, res) => {
  const scopes = [
    "user-read-private",
    "user-read-email",
    "user-top-read",
    "user-read-recently-played",
    "playlist-read-private",
    "playlist-read-collaborative"
  ].join(" ");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: SPOTIFY_CLIENT_ID,
    scope: scopes,
    redirect_uri: `${FRONTEND_URL}/callback/spotify`,
    state: "spotify_login",
  });

  const authUrl = `https://accounts.spotify.com/authorize?${params}`;
  res.json({ authUrl });
});

router.post("/login", async (req, res) => {
  try {
    console.log("🎵 Spotify login attempt");
    const { code, state } = req.body;

    if (state !== "spotify_login") {
      console.log("❌ Invalid state parameter:", state);
      return res.status(400).json({ error: "Invalid state parameter" });
    }

    if (!code) {
      console.log("❌ No authorization code");
      return res.status(400).json({ error: "No authorization code provided" });
    }

    console.log("🎵 Exchanging code for tokens...");
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
    console.log("🎵 Tokens received successfully");

    console.log("🎵 Getting Spotify profile...");
    const profileResponse = await axios.get("https://api.spotify.com/v1/me", {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const spotifyProfile = profileResponse.data;
    console.log("🎵 Profile received for:", spotifyProfile.id);

    // Check if user already exists with this Spotify ID
    let user = await User.findOne({ where: { spotifyId: spotifyProfile.id } });

    if (!user) {
      console.log("🎵 Creating new user...");
      
      // Generate safe username
      const username = await generateUsername(spotifyProfile);
      console.log("🎵 Generated username:", username);

      // Create new user with Spotify data
      user = await User.create({
        username: username,
        email: spotifyProfile.email || null, // Email might be null
        spotifyId: spotifyProfile.id,
        spotifyAccessToken: access_token,
        spotifyRefreshToken: refresh_token,
        spotifyTokenExpiresAt: new Date(Date.now() + expires_in * 1000),
        spotifyDisplayName: spotifyProfile.display_name,
        spotifyProfileImage: spotifyProfile.images?.[0]?.url || null,
        passwordHash: null, // No password for Spotify-only users
      });
      
      console.log("🎵 User created with ID:", user.id);
    } else {
      console.log("🎵 Updating existing user...");
      // Update existing user's Spotify tokens
      await user.update({
        spotifyAccessToken: access_token,
        spotifyRefreshToken: refresh_token,
        spotifyTokenExpiresAt: new Date(Date.now() + expires_in * 1000),
        spotifyDisplayName: spotifyProfile.display_name,
        spotifyProfileImage: spotifyProfile.images?.[0]?.url || null,
      });
    }

    // Create JWT token
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

    console.log("🎵 Spotify login successful for user:", user.username);
    
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
    console.error("❌ Spotify login error:", error);
    console.error("❌ Error details:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      stack: error.stack
    });
    res.status(500).json({ error: "Failed to login with Spotify" });
  }
});

router.get("/auth-url", authenticateJWT, (req, res) => {
  const scopes = [
    "user-read-private",
    "user-read-email",
    "user-top-read",
    "user-read-recently-played",
    "playlist-read-private",
    "playlist-read-collaborative"
  ].join(" ");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: SPOTIFY_CLIENT_ID,
    scope: scopes,
    redirect_uri: `${FRONTEND_URL}/callback/spotify`,
    state: req.user.id.toString(),
  });

  const authUrl = `https://accounts.spotify.com/authorize?${params}`;
  res.json({ authUrl });
});

router.post("/callback", authenticateJWT, async (req, res) => {
  try {
    const { code, state } = req.body;

    if (!code) {
      return res.status(400).json({ error: "No authorization code received" });
    }

    if (state !== req.user.id.toString()) {
      return res.status(400).json({ error: "Invalid state parameter" });
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
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

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
    res.status(500).json({ error: "Failed to connect Spotify account" });
  }
});

router.get("/profile", authenticateJWT, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user.spotifyId) {
      return res.json({ connected: false });
    }

    const accessToken = await getValidSpotifyToken(user);

    const profileResponse = await axios.get("https://api.spotify.com/v1/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    res.json({
      connected: true,
      profile: profileResponse.data,
    });
  } catch (error) {
    if (error.message === "Spotify not connected") {
      return res.json({ connected: false });
    }
    res.status(500).json({ error: "Failed to get Spotify profile" });
  }
});

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
    res.status(500).json({ error: "Failed to get top tracks" });
  }
});

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
    res.status(500).json({ error: "Failed to disconnect Spotify" });
  }
});

module.exports = router;