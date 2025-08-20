const express = require("express");
const router = express.Router();
const {
  Posts,
  User,
  PostLike,
  Comments,
  Notification,
} = require("../database");
const { authenticateJWT } = require("../auth");
const { emitToUser } = require("../socket-server");

async function ensureSpotifyAccessToken(user) {
  if (!user.spotifyAccessToken && !user.spotifyRefreshToken) {
    throw new Error("Spotify not linked");
  }

  const now = Date.now();
  const expMs = user.spotifyTokenExpiresAt
    ? new Date(user.spotifyTokenExpiresAt).getTime()
    : 0;
  const needsRefresh = !user.spotifyAccessToken || expMs - now < 60000;

  if (!needsRefresh) return user.spotifyAccessToken;

  const params = new URLSearchParams();
  params.append("grant_type", "refresh_token");
  params.append("refresh_token", user.spotifyRefreshToken);

  const basic = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString("base64");

  const resp = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Failed to refresh Spotify token: ${resp.status} ${t}`);
  }

  const data = await resp.json();
  user.spotifyAccessToken = data.access_token;
  if (data.expires_in) {
    user.spotifyTokenExpiresAt = new Date(
      Date.now() + (data.expires_in - 60) * 1000
    );
  }
  if (data.refresh_token) {
    user.spotifyRefreshToken = data.refresh_token;
  }
  await user.save();
  return user.spotifyAccessToken;
}

function extractPlaylistIdFromPost(post) {
  const embedUrl = post.spotifyEmbedUrl;

  if (!embedUrl || typeof embedUrl !== "string") {
    return null;
  }

  // Handle Spotify embed URLs
  // Format: https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M?utm_source=generator
  if (embedUrl.includes("open.spotify.com/embed/playlist/")) {
    const match = embedUrl.match(
      /open\.spotify\.com\/embed\/playlist\/([a-zA-Z0-9]+)/
    );
    if (match && match[1]) {
      return match[1];
    }
  }

  // Handle regular Spotify playlist URLs (just in case)
  // Format: https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M
  if (embedUrl.includes("open.spotify.com/playlist/")) {
    const match = embedUrl.match(
      /open\.spotify\.com\/playlist\/([a-zA-Z0-9]+)/
    );
    if (match && match[1]) {
      return match[1];
    }
  }

  // Handle Spotify URIs (just in case)
  // Format: spotify:playlist:37i9dQZF1DXcBWIGoYBM5M
  if (embedUrl.startsWith("spotify:playlist:")) {
    const id = embedUrl.split(":")[2];
    if (id) {
      return id;
    }
  }

  return null;
}

async function fetchAllPlaylistTrackUris(accessToken, playlistId) {
  const uris = [];
  let url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?fields=items(track(uri)),next&limit=100`;
  while (url) {
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!r.ok) {
      const t = await r.text();
      throw new Error(`Fetch tracks failed: ${r.status} ${t}`);
    }
    const json = await r.json();
    (json.items || []).forEach((it) => {
      const uri = it?.track?.uri;
      if (uri) uris.push(uri);
    });
    url = json.next;
  }
  return uris;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// Get all published posts (public feed)
router.get("/feed", async (req, res) => {
  try {
    const userId = req.user?.id;

    const posts = await Posts.findAll({
      where: { status: "published" },
      include: [
        {
          model: User,
          as: "author",
          attributes: [
            "username",
            "id",
            "spotifyDisplayName",
            "profileImage",
            "spotifyProfileImage",
            "avatarURL",
          ],
        },
        {
          model: PostLike,
          as: "likes",
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id"],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    // Add like information to each post
    const postsWithLikes = posts.map((post) => {
      const postData = post.toJSON();
      postData.likesCount = postData.likes ? postData.likes.length : 0;
      postData.isLiked = userId
        ? postData.likes?.some((like) => like.user.id === userId)
        : false;
      return postData;
    });

    res.json(postsWithLikes);
  } catch (error) {
    console.error("Error fetching feed:", error);
    res.status(500).json({ error: "Failed to fetch feed" });
  }
});

router.get("/", async (req, res) => {
  try {
    const userId = req.user?.id;

    const posts = await Posts.findAll({
      include: [
        {
          model: User,
          as: "author",
          attributes: [
            "username",
            "id",
            "spotifyDisplayName",
            "profileImage",
            "spotifyProfileImage",
            "avatarURL",
          ],
        },
        {
          model: PostLike,
          as: "likes",
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id"],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const postsWithLikes = posts.map((post) => {
      const postData = post.toJSON();
      postData.likesCount = postData.likes ? postData.likes.length : 0;
      postData.isLiked = userId
        ? postData.likes?.some((like) => like.user.id === userId)
        : false;
      return postData;
    });

    res.json(postsWithLikes);
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

// my post route
router.get("/my", authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const posts = await Posts.findAll({
      where: { userId },
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
        {
          model: PostLike,
          as: "likes",
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id"],
            },
          ],
        },
        {
          model: Comments,
          as: "comments",
          include: [
            {
              model: User,
              as: "author",
              attributes: ["id", "username", "profileImage"],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const postsWithLikes = posts.map((post) => {
      const postData = post.toJSON();
      postData.likesCount = postData.likes ? postData.likes.length : 0;
      postData.isLiked =
        postData.likes?.some((like) => like.user.id === userId) || false;
      postData.commentsCount = postData.comments ? postData.comments.length : 0;
      return postData;
    });

    res.json(postsWithLikes);
  } catch (error) {
    console.error("Error fetching user's posts:", error);
    res.status(500).json({ error: "Failed to fetch your posts" });
  }
});

router.patch("/:id", authenticateJWT, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;
    const updateData = req.body;

    const post = await Posts.findOne({ where: { id: postId, userId } });
    if (!post) {
      return res
        .status(404)
        .json({ error: "Post not found or not authorized" });
    }

    await post.update(updateData);
    res.json({ success: true, post });
  } catch (error) {
    console.error("Error updating post:", error);
    res.status(500).json({ error: "Failed to update post" });
  }
});

// Get posts if status === draft
router.get("/draft", authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;

    const drafts = await Posts.findAll({
      where: {
        userId: userId,
        status: "draft",
      },
      include: [
        {
          model: User,
          as: "author",
          attributes: [
            "username",
            "id",
            "spotifyDisplayName",
            "profileImage",
            "spotifyProfileImage",
            "avatarURL",
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json(drafts);
  } catch (error) {
    console.error("Error fetching drafts:", error);
    res.status(500).json({ error: "Failed to fetch drafts" });
  }
});

// Get single post by ID
router.get("/:id", async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user?.id;

    const post = await Posts.findByPk(postId, {
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
        {
          model: PostLike,
          as: "likes",
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id"],
            },
          ],
        },
      ],
    });

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const postData = post.toJSON();
    postData.likesCount = postData.likes ? postData.likes.length : 0;
    postData.isLiked = userId
      ? postData.likes?.some((like) => like.user.id === userId)
      : false;

    res.json(postData);
  } catch (error) {
    console.error("Error fetching post:", error);
    res.status(500).json({ error: "Failed to fetch post" });
  }
});

// Create a new post
router.post("/", authenticateJWT, async (req, res) => {
  try {
    const {
      title,
      description,
      spotifyArtistId,
      spotifyTrackId,
      spotifyPlaylistId,
      spotifyAlbumId,
      spotifyArtistName,
      spotifyTrackName,
      spotifyPlaylistName,
      spotifyAlbumName,
      spotifyType,
      spotifyEmbedUrl,
      status = "published",
      originalPostId,
    } = req.body;

    const userId = req.user.id;

    if (!title || !description) {
      return res
        .status(400)
        .json({ error: "Title and description are required" });
    }

    const post = await Posts.create({
      title,
      description,
      userId,
      spotifyArtistId,
      spotifyTrackId,
      spotifyPlaylistId,
      spotifyAlbumId,
      spotifyArtistName,
      spotifyTrackName,
      spotifyPlaylistName,
      spotifyAlbumName,
      spotifyType,
      spotifyEmbedUrl,
      status,
      originalPostId,
    });

    const createdPost = await Posts.findByPk(post.id, {
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
    });

    res.status(201).json(createdPost);
  } catch (error) {
    console.error("Error creating post:", error);
    res.status(500).json({ error: "Failed to create post" });
  }
});

// Update a post
router.put("/:id", authenticateJWT, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    const post = await Posts.findByPk(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (post.userId !== userId) {
      return res
        .status(403)
        .json({ error: "Not authorized to edit this post" });
    }

    const {
      title,
      description,
      spotifyArtistId,
      spotifyTrackId,
      spotifyPlaylistId,
      spotifyAlbumId,
      spotifyArtistName,
      spotifyTrackName,
      spotifyPlaylistName,
      spotifyAlbumName,
      spotifyType,
      spotifyEmbedUrl,
      status,
    } = req.body;

    await post.update({
      title: title || post.title,
      description: description || post.description,
      spotifyArtistId:
        spotifyArtistId !== undefined ? spotifyArtistId : post.spotifyArtistId,
      spotifyTrackId:
        spotifyTrackId !== undefined ? spotifyTrackId : post.spotifyTrackId,
      spotifyPlaylistId:
        spotifyPlaylistId !== undefined
          ? spotifyPlaylistId
          : post.spotifyPlaylistId,
      spotifyAlbumId:
        spotifyAlbumId !== undefined ? spotifyAlbumId : post.spotifyAlbumId,
      spotifyArtistName:
        spotifyArtistName !== undefined
          ? spotifyArtistName
          : post.spotifyArtistName,
      spotifyTrackName:
        spotifyTrackName !== undefined
          ? spotifyTrackName
          : post.spotifyTrackName,
      spotifyPlaylistName:
        spotifyPlaylistName !== undefined
          ? spotifyPlaylistName
          : post.spotifyPlaylistName,
      spotifyAlbumName:
        spotifyAlbumName !== undefined
          ? spotifyAlbumName
          : post.spotifyAlbumName,
      spotifyType: spotifyType !== undefined ? spotifyType : post.spotifyType,
      spotifyEmbedUrl:
        spotifyEmbedUrl !== undefined ? spotifyEmbedUrl : post.spotifyEmbedUrl,
      status: status || post.status,
    });

    const updatedPost = await Posts.findByPk(postId, {
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
    });

    res.json(updatedPost);
  } catch (error) {
    console.error("Error updating post:", error);
    res.status(500).json({ error: "Failed to update post" });
  }
});

// Delete a post
router.delete("/:id", authenticateJWT, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    const post = await Posts.findByPk(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (post.userId !== userId) {
      return res
        .status(403)
        .json({ error: "Not authorized to delete this post" });
    }

    await post.destroy();
    res.status(204).end();
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({ error: "Failed to delete post" });
  }
});

router.post("/:id/like", authenticateJWT, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    const post = await Posts.findByPk(postId, {
      include: [{ model: User, as: "author" }],
    });
    if (!post) return res.status(404).json({ error: "Post not found" });

    const existingLike = await PostLike.findOne({ where: { postId, userId } });
    let isLiked;

    if (existingLike) {
      await existingLike.destroy();
      isLiked = false;

      // Optional: clean up old notification
      await Notification.destroy({
        where: { type: "post_liked", postId, fromUserId: userId },
      });
    } else {
      await PostLike.create({ postId, userId });
      isLiked = true;

      // Only notify if not liking your own post
      if (post.userId !== userId) {
        const notif = await Notification.create({
          userId: post.userId,
          fromUserId: userId,
          type: "post_liked",
          postId,
        });

        // posts.js  (inside the LIKE branch after creating notif)
        const actor = await User.findByPk(userId, {
          attributes: [
            "id",
            "username",
            "spotifyDisplayName",
            "avatarURL",
            "profileImage",
            "spotifyProfileImage",
          ],
        });

        emitToUser(post.userId, "notification:new", {
          id: notif.id,
          type: "post_liked",
          postId,
          seen: false,
          createdAt: notif.createdAt,

          // flat fields (what your component likely uses)
          fromUserId: actor.id,
          fromUsername: actor.username || actor.spotifyDisplayName || "someone",
          fromAvatar:
            actor.avatarURL ||
            actor.profileImage ||
            actor.spotifyProfileImage ||
            null,

          // nested object (mirrors the API join)
          actor: {
            id: actor.id,
            username: actor.username,
            spotifyDisplayName: actor.spotifyDisplayName,
            avatarURL: actor.avatarURL,
            profileImage: actor.profileImage,
            spotifyProfileImage: actor.spotifyProfileImage,
          },
        });
      }
    }

    const likesCount = await PostLike.count({ where: { postId } });
    res.json({ success: true, isLiked, likesCount });
  } catch (err) {
    console.error("Error liking post:", err);
    res.status(500).json({ error: "Failed to like post" });
  }
});

router.post("/:id/fork-playlist", authenticateJWT, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;
    const { playlistName, isPublic, isCollaborative } = req.body;

    const [post, user] = await Promise.all([
      Posts.findByPk(postId, {
        include: [
          {
            model: User,
            as: "author",
            attributes: ["username", "spotifyDisplayName"],
          },
        ],
      }),
      User.findByPk(userId),
    ]);

    if (!post) return res.status(404).json({ error: "Post not found" });
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const type = (post.spotifyType || "").toLowerCase();
    if (type !== "playlist" && !post.spotifyEmbedUrl?.includes("/playlist/")) {
      return res.status(400).json({ error: "Post is not a Spotify playlist" });
    }

    const sourcePlaylistId = extractPlaylistIdFromPost(post);

    if (!sourcePlaylistId) {
      return res.status(400).json({
        error: "Playlist ID not found on post",
        embedUrl: post.spotifyEmbedUrl,
      });
    }

    const isSpotifyCurated = sourcePlaylistId.startsWith("37i9dQ");

    const accessToken = await ensureSpotifyAccessToken(user);

    let testPlaylist = null;
    let playlistFound = false;

    let testResp = await fetch(
      `https://api.spotify.com/v1/playlists/${sourcePlaylistId}?fields=id,name,public,collaborative,owner`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (testResp.ok) {
      testPlaylist = await testResp.json();
      playlistFound = true;
    } else {
      const tracksResp = await fetch(
        `https://api.spotify.com/v1/playlists/${sourcePlaylistId}/tracks?limit=1&fields=total`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (tracksResp.ok) {
        const tracksData = await tracksResp.json();

        testPlaylist = {
          id: sourcePlaylistId,
          name: `Spotify Playlist ${sourcePlaylistId}`,
          public: true,
          owner: { id: "spotify", display_name: "Spotify" },
        };
        playlistFound = true;
      }
    }

    if (!playlistFound) {
      const errorText = await testResp.text();

      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { error: { message: errorText } };
      }

      if (isSpotifyCurated) {
        return res.status(400).json({
          error:
            "This Spotify playlist cannot be forked due to API restrictions. Try with a user-created playlist instead.",
          extractedId: sourcePlaylistId,
          originalUrl: post.spotifyEmbedUrl,
          isSpotifyCurated: true,
        });
      } else {
        return res.status(400).json({
          error:
            "Spotify playlist not found. The playlist may be private, deleted, or the link may be broken.",
          extractedId: sourcePlaylistId,
          originalUrl: post.spotifyEmbedUrl,
          details: errorData,
        });
      }
    }

    const meResp = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!meResp.ok) {
      const t = await meResp.text();
      return res
        .status(400)
        .json({ error: `Failed to get Spotify profile: ${t}` });
    }
    const me = await meResp.json();

    const src = testPlaylist;
    const authorName =
      post.author?.username || post.author?.spotifyDisplayName || null;
    const newDesc = `Forked from ${src.name}${
      authorName ? ` by ${authorName}` : ""
    } via ${process.env.APP_NAME || "CapStone"}`;

    const createResp = await fetch(
      `https://api.spotify.com/v1/users/${me.id}/playlists`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: playlistName || `Fork • ${src.name}`,
          description: newDesc,
          public: isPublic !== undefined ? isPublic : true,
          collaborative: isCollaborative || false,
        }),
      }
    );
    if (!createResp.ok) {
      const t = await createResp.text();
      return res.status(400).json({ error: `Failed to create playlist: ${t}` });
    }
    const created = await createResp.json();

    try {
      const uris = await fetchAllPlaylistTrackUris(
        accessToken,
        sourcePlaylistId
      );

      if (uris.length === 0) {
        return res.json({
          success: true,
          message:
            "Playlist forked successfully, but no tracks were found to copy.",
          playlistId: created.id,
          playlistUrl: created.external_urls?.spotify || null,
          trackCount: 0,
        });
      }

      for (const group of chunk(uris, 100)) {
        const addResp = await fetch(
          `https://api.spotify.com/v1/playlists/${created.id}/tracks`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ uris: group }),
          }
        );
        if (!addResp.ok) {
          const t = await addResp.text();
          return res.status(400).json({ error: `Failed adding tracks: ${t}` });
        }
      }

      return res.json({
        success: true,
        message:
          "Playlist successfully forked and added to your Spotify library.",
        playlistId: created.id,
        playlistUrl: created.external_urls?.spotify || null,
        trackCount: uris.length,
      });
    } catch (trackError) {
      return res.status(400).json({
        error:
          "Could not access playlist tracks. The playlist may be private or restricted.",
      });
    }
  } catch (err) {
    console.error("Fork playlist error:", err);
    res.status(500).json({ error: "Failed to fork playlist" });
  }
});

module.exports = router;
