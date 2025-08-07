const db = require("./db");
const { User, Post } = require("./index");

const seed = async () => {
  try {
    db.logging = false;
    await db.sync({ force: true });

    const users = await User.bulkCreate([
      { id: 1, username: "admin", passwordHash: User.hashPassword("admin123") },
      { id: 2, username: "user1", passwordHash: User.hashPassword("user111") },
      { id: 3, username: "user2", passwordHash: User.hashPassword("user222") },
      { id: 4, username: "user3", passwordHash: User.hashPassword("user333") },
      { id: 5, username: "user4", passwordHash: User.hashPassword("user444") },
    ]);

    console.log(`👤 Created ${users.length} users`);

    const posts = await Post.bulkCreate([
      // User 1
      {
        title: "Admin Vibes",
        description: "Admin is testing things.",
        status: "draft",
        userId: 1,
        spotifyId: "37i9dQZF1DXcBWIGoYBM5M",
        spotifyType: "playlist",
        spotifyEmbedUrl:
          "https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M",
      },
      {
        title: "Lo-Fi Work Flow",
        description: "Perfect background music.",
        status: "published",
        userId: 1,
        spotifyId: "37i9dQZF1DXdPec7aLTmlC",
        spotifyType: "playlist",
        spotifyEmbedUrl:
          "https://open.spotify.com/embed/playlist/37i9dQZF1DXdPec7aLTmlC",
      },
      {
        title: "Rock & Roll!",
        description: "Classic rock hits I love.",
        status: "draft",
        userId: 1,
        spotifyId: "37i9dQZF1DWXRqgorJj26U",
        spotifyType: "playlist",
        spotifyEmbedUrl:
          "https://open.spotify.com/embed/playlist/37i9dQZF1DWXRqgorJj26U",
      },
      {
        title: "Motivation Boost",
        description: "Hype music to crush the day.",
        status: "published",
        userId: 1,
        spotifyId: "7qiZfU4dY1lWllzX7mPBI3",
        spotifyType: "track",
        spotifyEmbedUrl:
          "https://open.spotify.com/embed/track/7qiZfU4dY1lWllzX7mPBI3",
      },
      {
        title: "Calm Mornings",
        description: "Wake up gently.",
        status: "published",
        userId: 1,
        spotifyId: "3KkXRkHbMCARz0aVfEt68P",
        spotifyType: "track",
        spotifyEmbedUrl:
          "https://open.spotify.com/embed/track/3KkXRkHbMCARz0aVfEt68P",
      },

      // User 2
      {
        title: "Late Night Drive",
        description: "Vibes for cruising.",
        status: "published",
        userId: 2,
        spotifyId: "6habFhsOp2NvshLv26DqMb",
        spotifyType: "track",
        spotifyEmbedUrl:
          "https://open.spotify.com/embed/track/6habFhsOp2NvshLv26DqMb",
      },
      {
        title: "Hip-Hop Energy",
        description: "Stay pumped.",
        status: "published",
        userId: 2,
        spotifyId: "37i9dQZF1DX0XUsuxWHRQd",
        spotifyType: "playlist",
        spotifyEmbedUrl:
          "https://open.spotify.com/embed/playlist/37i9dQZF1DX0XUsuxWHRQd",
      },
      {
        title: "The Weekend Wave",
        description: "Weekend vibes incoming.",
        status: "published",
        userId: 2,
        spotifyId: "3U4isOIWM3VvDubwSI3y7a",
        spotifyType: "track",
        spotifyEmbedUrl:
          "https://open.spotify.com/embed/track/3U4isOIWM3VvDubwSI3y7a",
      },
      {
        title: "Pop Culture Hits",
        description: "All the trending pop songs.",
        status: "published",
        userId: 2,
        spotifyId: "37i9dQZF1DXcF6B6QPhFDv",
        spotifyType: "playlist",
        spotifyEmbedUrl:
          "https://open.spotify.com/embed/playlist/37i9dQZF1DXcF6B6QPhFDv",
      },
      {
        title: "Mellow Mood",
        description: "For rainy evenings.",
        status: "published",
        userId: 2,
        spotifyId: "2Fxmhks0bxGSBdJ92vM42m",
        spotifyType: "track",
        spotifyEmbedUrl:
          "https://open.spotify.com/embed/track/2Fxmhks0bxGSBdJ92vM42m",
      },

      // User 3
      {
        title: "Throwback Thursday",
        description: "Hits from the 2000s.",
        status: "published",
        userId: 3,
        spotifyId: "37i9dQZF1DWYmmr74INQlb",
        spotifyType: "playlist",
        spotifyEmbedUrl:
          "https://open.spotify.com/embed/playlist/37i9dQZF1DWYmmr74INQlb",
      },
      {
        title: "Study Mode On",
        description: "Helps me focus.",
        status: "published",
        userId: 3,
        spotifyId: "37i9dQZF1DX8Uebhn9wzrS",
        spotifyType: "playlist",
        spotifyEmbedUrl:
          "https://open.spotify.com/embed/playlist/37i9dQZF1DX8Uebhn9wzrS",
      },
      {
        title: "Classic Chill",
        description: "Old school but gold.",
        status: "published",
        userId: 3,
        spotifyId: "6QgjcU0zLnzq5OrUoSZ3OK",
        spotifyType: "track",
        spotifyEmbedUrl:
          "https://open.spotify.com/embed/track/6QgjcU0zLnzq5OrUoSZ3OK",
      },
      {
        title: "Top Gaming Tracks",
        description: "Perfect for grinding ranked.",
        status: "published",
        userId: 3,
        spotifyId: "37i9dQZF1DX2sUQwD7tbmL",
        spotifyType: "playlist",
        spotifyEmbedUrl:
          "https://open.spotify.com/embed/playlist/37i9dQZF1DX2sUQwD7tbmL",
      },
      {
        title: "Energy Boost",
        description: "Turn it up!",
        status: "published",
        userId: 3,
        spotifyId: "4uLU6hMCjMI75M1A2tKUQC",
        spotifyType: "track",
        spotifyEmbedUrl:
          "https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC",
      },
      // Posts for user 4
      {
        title: "Late Night Chill",
        description: "This playlist puts me to sleep (in a good way).",
        status: "published",
        userId: 4,
        spotifyId: "37i9dQZF1DWVzZlRWgqAGH",
        spotifyType: "playlist",
        spotifyEmbedUrl:
          "https://open.spotify.com/embed/playlist/37i9dQZF1DWVzZlRWgqAGH",
      },
      {
        title: "Favorite Banger",
        description: "Crank it loud!",
        status: "published",
        userId: 4,
        spotifyId: "0eGsygTp906u18L0Oimnem",
        spotifyType: "track",
        spotifyEmbedUrl:
          "https://open.spotify.com/embed/track/0eGsygTp906u18L0Oimnem",
      },
      {
        title: "Feel Good Mix",
        description: "This always boosts my mood.",
        status: "published",
        userId: 4,
        spotifyId: "37i9dQZF1DXdPec7aLTmlC",
        spotifyType: "playlist",
        spotifyEmbedUrl:
          "https://open.spotify.com/embed/playlist/37i9dQZF1DXdPec7aLTmlC",
      },
      {
        title: "Bop Playlist 💿",
        description: "My current favorite finds. Trust me.",
        status: "published",
        userId: 4,
        spotifyId: "37i9dQZF1DXcBWIGoYBM5M",
        spotifyType: "playlist",
        spotifyEmbedUrl:
          "https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M",
      },
    ]);

    console.log(`📝 Created ${posts.length} posts`);

    console.log("🌱 Seeded the database");
  } catch (error) {
    console.error("Error seeding database:", error);
  } finally {
    db.close();
  }
};

seed();
