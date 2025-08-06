const express = require("express");
const axios = require("axios");

const router = express.Router();

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

let spotifyAccessToken = null;
let tokenExpiresAt = null;

const getSpotifyClientToken = async () => {
  try {
    if (spotifyAccessToken && tokenExpiresAt && new Date() < tokenExpiresAt) {
      return spotifyAccessToken;
    }

    // Get new token
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({
        grant_type: "client_credentials",
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
    spotifyAccessToken = access_token;
    tokenExpiresAt = new Date(Date.now() + (expires_in - 60) * 1000);

    return spotifyAccessToken;
  } catch (error) {
    console.error("Error getting Spotify client token:", error.message);
    throw new Error("Failed to get Spotify access token");
  }
};

// Helper function to safely format tracks
const formatTracks = (tracks) => {
  if (!tracks || !tracks.items) return [];
  
  return tracks.items
    .filter(track => track && track.id && track.name)
    .map(track => ({
      id: track.id,
      name: track.name,
      type: "track",
      author: track.artists && track.artists.length > 0 
        ? track.artists.map(artist => artist?.name || "Unknown Artist").join(", ")
        : "Unknown Artist",
      image: track.album?.images?.[0]?.url || null,
      spotify_url: track.external_urls?.spotify || null,
      preview_url: track.preview_url || null,
      duration_ms: track.duration_ms || 0,
      album: track.album?.name || "Unknown Album",
    }));
};

// Helper function to safely format artists
const formatArtists = (artists) => {
  if (!artists || !artists.items) return [];
  
  return artists.items
    .filter(artist => artist && artist.id && artist.name)
    .map(artist => ({
      id: artist.id,
      name: artist.name,
      type: "artist",
      author: null,
      image: artist.images?.[0]?.url || null,
      spotify_url: artist.external_urls?.spotify || null,
      followers: artist.followers?.total || 0,
      genres: artist.genres || [],
    }));
};

// Helper function to safely format albums
const formatAlbums = (albums) => {
  if (!albums || !albums.items) return [];
  
  return albums.items
    .filter(album => album && album.id && album.name)
    .map(album => ({
      id: album.id,
      name: album.name,
      type: "album",
      author: album.artists && album.artists.length > 0 
        ? album.artists.map(artist => artist?.name || "Unknown Artist").join(", ")
        : "Unknown Artist",
      image: album.images?.[0]?.url || null,
      spotify_url: album.external_urls?.spotify || null,
      release_date: album.release_date || null,
      total_tracks: album.total_tracks || 0,
      album_type: album.album_type || "album",
    }));
};

// Helper function to safely format playlists
const formatPlaylists = (playlists) => {
  if (!playlists || !playlists.items) return [];
  
  return playlists.items
    .filter(playlist => playlist && playlist.id && playlist.name)
    .map(playlist => ({
      id: playlist.id,
      name: playlist.name,
      type: "playlist",
      author: playlist.owner?.display_name || "Unknown",
      image: playlist.images?.[0]?.url || null,
      spotify_url: playlist.external_urls?.spotify || null,
      description: playlist.description || "",
      track_count: playlist.tracks?.total || 0,
    }));
};

// Search endpoint
router.get("/", async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: "Search query 'q' is required" });
    }

    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
      return res.status(500).json({ error: "Spotify credentials not configured" });
    }

    // Get access token
    const accessToken = await getSpotifyClientToken();

    // Search Spotify API - now including albums
    const searchResponse = await axios.get("https://api.spotify.com/v1/search", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      params: {
        q: q.trim(),
        type: "track,artist,album,playlist", // Added album
        limit: 10, // Increased limit for better results
        market: "US",
      },
    });

    const searchData = searchResponse.data || {};
    
    // Format each type with null checks
    const formattedTracks = formatTracks(searchData.tracks);
    const formattedArtists = formatArtists(searchData.artists);
    const formattedAlbums = formatAlbums(searchData.albums);
    const formattedPlaylists = formatPlaylists(searchData.playlists);

    res.json({
      query: q,
      tracks: formattedTracks,
      artists: formattedArtists,
      albums: formattedAlbums,
      playlists: formattedPlaylists,
      total_results: {
        tracks: formattedTracks.length,
        artists: formattedArtists.length,
        albums: formattedAlbums.length,
        playlists: formattedPlaylists.length,
      }
    });

  } catch (error) {
    console.error("Search error:", error);
    
    if (error.response) {
      console.error("Spotify API error:", error.response.status, error.response.data);
    }
    
    if (error.response?.status === 400) {
      return res.status(400).json({ 
        error: "Invalid search query",
        details: error.response?.data 
      });
    }
    
    if (error.response?.status === 401) {
      return res.status(401).json({ 
        error: "Spotify authentication failed",
        details: "Invalid or expired client credentials"
      });
    }
    
    if (error.response?.status === 429) {
      return res.status(429).json({ 
        error: "Rate limit exceeded. Please try again later." 
      });
    }

    res.status(500).json({ 
      error: "Search failed",
      details: process.env.NODE_ENV === 'development' ? error.message : "Internal server error"
    });
  }
});

module.exports = router;