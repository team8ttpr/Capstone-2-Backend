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

// middlewares/requireSpotifyAuth.js
async function requireSpotifyAuth(req, res, next) {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ["spotifyDisplayName", "spotifyProfileImage"],
    });

    if (!user || !user.spotifyDisplayName) {
      // Redirect for non-Spotify users
      return res.status(302).redirect("/connect-spotify");
      // Or: return res.status(403).json({ error: "Spotify not connected" });
    }

    next();
  } catch (err) {
    console.error("Spotify auth check failed:", err);
    res.status(500).json({ error: "Server error" });
  }
}

//this function makes a call to get a spotify token
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

//this function uses refresh token to get a new token if the existing one expires
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

//this creates the username for a user based on the username provided by spotify
const generateUsername = async (spotifyProfile) => {
  let baseUsername =
    spotifyProfile.display_name || spotifyProfile.id || "spotify_user";

  baseUsername = baseUsername
    .replace(/[^a-zA-Z0-9_]/g, "_")
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

// uses client id to get login url for spotify
router.get("/login-url", (req, res) => {
  try {
    const scopes = [
      "user-read-private",
      "user-read-email",
      "user-top-read",
      "user-read-recently-played",
      "playlist-read-private",
      "playlist-read-collaborative",
      "playlist-modify-public",
      "playlist-modify-private",
    ].join(" ");

    const authUrl =
      "https://accounts.spotify.com/authorize?" +
      new URLSearchParams({
        response_type: "code",
        client_id: SPOTIFY_CLIENT_ID,
        scope: scopes,
        redirect_uri: `${FRONTEND_URL}/callback/spotify`,
        state: "spotify_login",
        show_dialog: true,
      });

    res.json({ authUrl });
  } catch (error) {
    console.error("Error generating Spotify login URL:", error.message);
    res.status(500).json({ error: "Failed to generate Spotify login URL" });
  }
});

// Get route for the user who is logged in
router.get("/auth-url", authenticateJWT, (req, res) => {
  try {
    const scopes = [
      "user-read-private",
      "user-read-email",
      "user-top-read",
      "user-read-recently-played",
      "playlist-read-private",
      "playlist-read-collaborative",
      "playlist-modify-public",
      "playlist-modify-private",
    ].join(" ");

    const authUrl =
      "https://accounts.spotify.com/authorize?" +
      new URLSearchParams({
        response_type: "code",
        client_id: SPOTIFY_CLIENT_ID,
        scope: scopes,
        redirect_uri: `${FRONTEND_URL}/callback/spotify`,
        state: req.user.id.toString(),
        show_dialog: true,
      });

    res.json({ authUrl });
  } catch (error) {
    console.error("Error generating Spotify auth URL:", error.message);
    res.status(500).json({ error: "Failed to generate auth URL" });
  }
});

// Post route for logging in with spotify
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
        if (validationError.name === "SequelizeValidationError") {
          const errorMessages = validationError.errors.map(
            (err) => err.message
          );
          return res.status(400).json({
            error: "User validation failed",
            details: errorMessages.join(", "),
          });
        }

        if (validationError.name === "SequelizeUniqueConstraintError") {
          return res.status(400).json({
            error: "User already exists with this data",
            details: validationError.message,
          });
        }

        throw validationError;
      }
    } else {
      await user.update({
        spotifyAccessToken: access_token,
        spotifyRefreshToken: refresh_token,
        spotifyTokenExpiresAt: new Date(Date.now() + expires_in * 1000),
        spotifyDisplayName:
          spotifyProfile.display_name || user.spotifyDisplayName,
        spotifyProfileImage:
          spotifyProfile.images?.[0]?.url || user.spotifyProfileImage,
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
        details: error.response?.data,
      });
    }

    res.status(500).json({
      error: "Failed to login with Spotify",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Callback url post route for spotify
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

// Get Spotify for logged in user
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
        images: user.spotifyProfileImage
          ? [{ url: user.spotifyProfileImage }]
          : [],
      },
    });
  } catch (error) {
    console.error("Error getting Spotify profile:", error.message);
    res.status(500).json({ error: "Failed to get profile" });
  }
});

// Get top tracks for logged in user
router.get(
  "/top-tracks",
  authenticateJWT,
  requireSpotifyAuth,
  async (req, res) => {
    try {
      const user = await User.findByPk(req.user.id);
      const accessToken = await getValidSpotifyToken(user);
      const timeRange = req.query.time_range || "long_term";

      const response = await axios.get(
        "https://api.spotify.com/v1/me/top/tracks",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: {
            limit: 20,
            time_range: timeRange,
          },
        }
      );

      res.json(response.data);
    } catch (error) {
      if (error.message === "Spotify not connected") {
        return res.status(401).json({ error: "Spotify not connected" });
      }
      console.error("Error getting top tracks:", error.message);
      res.status(500).json({ error: "Failed to get top tracks" });
    }
  }
);

//route for top artist
router.get(
  "/top-artists",
  authenticateJWT,
  requireSpotifyAuth,
  async (req, res) => {
    try {
      const user = await User.findByPk(req.user.id);
      const accessToken = await getValidSpotifyToken(user);

      const timeRanges = ["short_term", "medium_term", "long_term"];
      let bestResult = null;

      for (const timeRange of timeRanges) {
        try {
          const response = await axios.get(
            "https://api.spotify.com/v1/me/top/artists",
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
              params: {
                limit: 20,
                time_range: timeRange,
              },
            }
          );

          if (response.data.items.length > 0) {
            return res.json({
              ...response.data,
              time_range_used: timeRange,
            });
          }

          if (!bestResult) {
            bestResult = {
              ...response.data,
              time_range_used: timeRange,
            };
          }
        } catch (error) {
          console.error(
            `Error getting top artists for ${timeRange}:`,
            error.message
          );
        }
      }

      res.json(
        bestResult || {
          items: [],
          total: 0,
          message: "No listening history found for artists.",
        }
      );
    } catch (error) {
      if (error.message === "Spotify not connected") {
        return res.status(401).json({ error: "Spotify not connected" });
      }
      console.error("Error getting top artists:", error.message);
      res.status(500).json({ error: "Failed to get top artists" });
    }
  }
);

// Get user's playlists
router.get(
  "/playlists",
  authenticateJWT,
  requireSpotifyAuth,
  async (req, res) => {
    try {
      const user = await User.findByPk(req.user.id);
      const accessToken = await getValidSpotifyToken(user);

      const response = await axios.get(
        "https://api.spotify.com/v1/me/playlists",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: {
            limit: 50, // Get up to 50 playlists
            offset: 0,
          },
        }
      );

      res.json(response.data);
    } catch (error) {
      if (error.message === "Spotify not connected") {
        return res.status(401).json({ error: "Spotify not connected" });
      }
      console.error("Error getting playlists:", error.message);
      res.status(500).json({ error: "Failed to get playlists" });
    }
  }
);

// Get route individual playlist
router.get(
  "/playlists/:id",
  authenticateJWT,
  requireSpotifyAuth,
  async (req, res) => {
    try {
      const user = await User.findByPk(req.user.id);
      const accessToken = await getValidSpotifyToken(user);
      const playlistId = req.params.id;

      const response = await axios.get(
        `https://api.spotify.com/v1/playlists/${playlistId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      res.json(response.data);
    } catch (error) {
      if (error.message === "Spotify not connected") {
        return res.status(401).json({ error: "Spotify not connected" });
      }
      console.error("Error getting playlist details:", error.message);
      res.status(500).json({ error: "Failed to get playlist details" });
    }
  }
);

// Get route for playlist tracks
router.get(
  "/playlists/:id/tracks",
  authenticateJWT,
  requireSpotifyAuth,
  async (req, res) => {
    try {
      const user = await User.findByPk(req.user.id);
      const accessToken = await getValidSpotifyToken(user);
      const playlistId = req.params.id;

      const response = await axios.get(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: {
            limit: 100,
            offset: 0,
          },
        }
      );

      res.json(response.data);
    } catch (error) {
      if (error.message === "Spotify not connected") {
        return res.status(401).json({ error: "Spotify not connected" });
      }
      console.error("Error getting playlist tracks:", error.message);
      res.status(500).json({ error: "Failed to get playlist tracks" });
    }
  }
);

// Disconnect Spotify/ does not work at the moment
router.delete(
  "/disconnect",
  authenticateJWT,
  requireSpotifyAuth,
  async (req, res) => {
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
  }
);

// Endpoint to get user's Spotify listening history, top genres, and top artists by genre
router.get(
  "/history",
  authenticateJWT,
  requireSpotifyAuth,
  async (req, res) => {
    try {
      const user = await User.findByPk(req.user?.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      let accessToken;
      try {
        accessToken = await getValidSpotifyToken(user);
      } catch (tokenError) {
        return res
          .status(401)
          .json({ error: "Spotify token error", details: tokenError.message });
      }

      let recentTracks = [];
      try {
        const recentTracksRes = await axios.get(
          "https://api.spotify.com/v1/me/player/recently-played",
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: { limit: 50 },
          }
        );
        recentTracks = recentTracksRes.data.items || [];
      } catch (recentError) {
        return res.status(500).json({
          error: "Failed to fetch listening history",
          details: recentError.response?.data || recentError.message,
        });
      }

      let topArtists = [];
      try {
        const topArtistsRes = await axios.get(
          "https://api.spotify.com/v1/me/top/artists",
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: { limit: 20, time_range: "medium_term" },
          }
        );
        topArtists = topArtistsRes.data.items || [];
      } catch (topError) {
        return res.status(500).json({
          error: "Failed to fetch top genres and artists",
          details: topError.response?.data || topError.message,
        });
      }

      // Aggregate genres from top artists
      const genreCount = {};
      topArtists.forEach((artist) => {
        artist.genres.forEach((genre) => {
          genreCount[genre] = (genreCount[genre] || 0) + 1;
        });
      });
      // Sort genres by count
      const topGenres = Object.entries(genreCount)
        .sort((a, b) => b[1] - a[1])
        .map(([genre, count]) => ({ genre, count }));

      // Rank top artists by genre
      const artistsByGenre = {};
      topArtists.forEach((artist) => {
        artist.genres.forEach((genre) => {
          if (!artistsByGenre[genre]) artistsByGenre[genre] = [];
          artistsByGenre[genre].push({
            id: artist.id,
            name: artist.name,
            popularity: artist.popularity,
            images: artist.images,
          });
        });
      });
      // Sort artists in each genre by popularity
      Object.keys(artistsByGenre).forEach((genre) => {
        artistsByGenre[genre].sort((a, b) => b.popularity - a.popularity);
      });

      res.json({
        recentTracks: recentTracks.map((item) => ({
          track: {
            id: item.track.id,
            name: item.track.name,
            artists: item.track.artists.map((a) => a.name),
            album: item.track.album.name,
            played_at: item.track.played_at,
          },
        })),
        topGenres,
        artistsByGenre,
      });
    } catch (error) {
      res.status(500).json({
        error: "Unexpected error in Spotify history endpoint",
        details: error.message,
      });
    }
  }
);

// generate uer playlist off of prompt
// receives a playlist prompt from the frontend, sends it to Gemini AI,
// validates the response, searches Spotify for matching tracks, creates a playlist,
// and returns the playlist URL rawr
router.post(
  "/ai-playlist",
  authenticateJWT,
  requireSpotifyAuth,
  async (req, res) => {
    try {
      // 1. get the prompt from the frontend
      const { prompt } = req.body;
      //  validate the prompt: must be a string, not too short, and music-related
      if (
        !prompt ||
        typeof prompt !== "string" ||
        prompt.trim().length < 5 ||
        /^(hi|hello|hey)$/i.test(prompt.trim())
      ) {
        // if prompt is invalid, send a friendly message
        return res.json({
          message: "Hi there! Send a mood, genre, or vibe and I can make a playlist for you 😊",
        });
      }

      //  send the prompt to gemini ai and get a list of songs/artists
      let aiResponse;
      try {
        aiResponse = await getGeminiPlaylist(
          `You are an expert playlist concierge. Given this user message: "${prompt}", infer the musical intent and generate a playlist of exactly 20 songs. For each song, return a JSON array of objects with "song" and "artist" fields. Only output the array, no extra text. If the message is not music-related, return an empty array.`
        );
      } catch (err) {
        // if gemini fails, send a fallback message
        console.error("Gemini AI error:", err);
        return res.json({
          message: "Sorry, I couldn't generate a playlist. Try a different prompt.",
        });
      }

      //  validate gemini's output: must be a non-empty array
      if (!Array.isArray(aiResponse) || aiResponse.length === 0) {
        return res.json({
          message: "Send a mood, genre, or vibe and I can make a playlist for you.",
        });
      }

      // maximum of 20 songs
      const MAX_SONGS = 20;
      const limitedResponse = aiResponse.slice(0, MAX_SONGS);

      //  for each song/artist, search spotify for a track id
      const user = await User.findByPk(req.user.id);
      const accessToken = await getValidSpotifyToken(user);
      const trackUris = [];
      for (const { song, artist } of limitedResponse) {
        try {
          // search spotify for the track
          const searchRes = await axios.get(
            "https://api.spotify.com/v1/search",
            {
              headers: { Authorization: `Bearer ${accessToken}` },
              params: {
                q: `track:${song} artist:${artist}`,
                type: "track",
                limit: 1,
              },
            }
          );
          const track = searchRes.data.tracks.items[0];
          if (track && track.uri) trackUris.push(track.uri);
        } catch (err) {
          // log errors but continue
          console.error(
            `Spotify search error for ${song} by ${artist}:`,
            err.message
          );
        }
      }

      // if no tracks found, send a fallback message
      if (trackUris.length === 0) {
        return res.json({
          message: "Sorry, I couldn't find any matching songs. Try a different prompt.",
        });
      }

      //  create a new playlist for the user
      let playlistId, playlistUrl;
      try {
        const playlistRes = await axios.post(
          `https://api.spotify.com/v1/users/${user.spotifyId}/playlists`,
          {
            name: `AI Playlist: ${prompt}`,
            description: `Created by AI on Spotter for: ${prompt}`,
            public: false,
          },
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        playlistId = playlistRes.data.id;
        playlistUrl = playlistRes.data.external_urls.spotify;
      } catch (err) {
        // if playlist creation fails, send a fallback message
        console.error("Spotify playlist creation error:", err.message);
        return res.json({
          message: "Sorry, I couldn't create a playlist. Try again later.",
        });
      }

      // add tracks to the playlist
      try {
        await axios.post(
          `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
          { uris: trackUris },
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
      } catch (err) {
        // if adding tracks fails, send a partial success message
        console.error("Spotify add tracks error:", err.message);
        return res.json({
          message: "Playlist created, but couldn't add songs. Try again later.",
        });
      }

      //  send the playlist url back to the frontend
      return res.json({ message: "We have created your playlist!!!, go to spotify to view it 👍",
      playlistUrl
    });
    } catch (error) {
      // catch-all error handler
      console.error("AI Playlist error:", error);
      return res.json({
        message: "Send a mood, genre, or vibe and I can make a playlist for you.",
      });
    }
  }
);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function getGeminiPlaylist(prompt) {
  try {
    //AI prompt default
    const geminiPrompt = `You are an expert music playlist curator. Given the user input: "${prompt}", determine if it expresses a music-related intent. If yes, infer the intended mood, activity, genre, or theme and generate a playlist of exactly 20 unique songs. Each entry must be an object with \"song\" and \"artist\" fields, diverse across artists/eras/genres when appropriate, avoiding duplicates and overly obscure tracks unless explicitly requested. If the input is unrelated to music or too unclear, return an empty array. Output ONLY a valid JSON array of objects in the format: [{\"song\": \"...\", \"artist\": \"...\"}] with no extra text, notes, or formatting.`;

    const response = await axios.post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      {
        contents: [
          {
            parts: [
              {
                text: geminiPrompt
              }
            ]
          }
        ]
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": GEMINI_API_KEY
        }
      }
    );

    // parse Gemini's response
    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("No response from Gemini");

    // Try to extract JSON from the response
    const match = text.match(/\[.*\]/s);
    if (!match) throw new Error("No JSON array found in Gemini response");
    return JSON.parse(match[0]);
  } catch (err) {
    console.error("Gemini API error:", err.message);
    throw err;
  }
}

// route to generate recommendations with gemini to display on analytics, uses Promise.all for parallel Spotify search
router.get(
  "/ai-recommendations",
  authenticateJWT,
  requireSpotifyAuth,
  async (req, res) => {
    try {
      const user = await User.findByPk(req.user.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      let accessToken;
      try {
        accessToken = await getValidSpotifyToken(user);
      } catch (tokenError) {
        return res.status(401).json({ error: "Spotify token error", details: tokenError.message });
      }
      // fetch recent tracks and top artists
      let recentTracks = [];
      let topArtists = [];
      let topGenres = [];
      try {
        const recentTracksRes = await axios.get(
          "https://api.spotify.com/v1/me/player/recently-played",
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: { limit: 50 },
          }
        );
        recentTracks = recentTracksRes.data.items || [];
      } catch {}
      try {
        const topArtistsRes = await axios.get(
          "https://api.spotify.com/v1/me/top/artists",
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: { limit: 50, time_range: "medium_term" },
          }
        );
        topArtists = topArtistsRes.data.items || [];
        // Aggregate genres from top artists
        const genreCount = {};
        topArtists.forEach((artist) => {
          artist.genres.forEach((genre) => {
            genreCount[genre] = (genreCount[genre] || 0) + 1;
          });
        });
        topGenres = Object.entries(genreCount)
          .sort((a, b) => b[1] - a[1])
          .map(([genre, count]) => genre);
      } catch {}
      // enhaced prompt with user data
      const listeningHistoryStr = recentTracks.length > 0
        ? recentTracks.map(item => `${item.track.name} by ${item.track.artists.map(a => a.name).join(', ')}`).join('; ')
        : 'None';
      const topArtistsStr = topArtists.length > 0
        ? topArtists.map(a => a.name).join(', ')
        : 'None';
      const topGenresStr = topGenres.length > 0
        ? topGenres.join(', ')
        : 'None';
      const geminiPrompt = `You are an expert music recommender. Here is the user's Spotify data:\nListening history: ${listeningHistoryStr}\nTop artists: ${topArtistsStr}\nTop genres: ${topGenresStr}\nBased on this data, recommend a list of AT LEAST 20 less known or underground songs that the user is likely to enjoy but may not have listened to yet. Personalize the recommendations using the provided listening history, artists, and genres, and avoid repeated artists. For each song, return a JSON object with 'song', 'artist', and 'genre' fields. Only output the array.`;
      let aiResponse;
      try {
        const response = await axios.post(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
          {
            contents: [
              {
                parts: [
                  { text: geminiPrompt }
                ]
              }
            ]
          },
          {
            headers: {
              "Content-Type": "application/json",
              "X-goog-api-key": process.env.GEMINI_API_KEY
            }
          }
        );
        const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const match = text.match(/\[.*\]/s);
        if (match) {
          aiResponse = JSON.parse(match[0]);
        } else {
          aiResponse = [];
        }
      } catch (err) {
        return res.status(500).json({ error: "Gemini recommendation error", details: err.message });
      }
      // search the track on spotify in parallel
      const trackPromises = aiResponse.map(async (rec) => {
        try {
          const searchRes = await axios.get(
            "https://api.spotify.com/v1/search",
            {
              headers: { Authorization: `Bearer ${accessToken}` },
              params: {
                q: `track:${rec.song} artist:${rec.artist}`,
                type: "track",
                limit: 1,
              },
            }
          );
          const track = searchRes.data.tracks.items[0];
          if (track && track.id) {
            return { id: track.id, uri: track.uri, name: track.name, artist: track.artists.map(a => a.name).join(", "), genre: rec.genre || null };
          }
        } catch (err) {
          // skip if not found
        }
        return null;
      });
      const tracksRaw = await Promise.all(trackPromises);
      const tracks = tracksRaw.filter(Boolean);
      res.json({ tracks });
    } catch (error) {
      res.status(500).json({ error: "Unexpected error in AI recommendations endpoint", details: error.message });
    }
  }
);

module.exports = router;
