const db = require("./db");
const {
  User,
  Posts,
  Follows,
  PostLike,
  Comments,
  Notification,
} = require("./index");

const seed = async () => {
  try {
    await db.sync({ force: true });

    const users = await User.bulkCreate([
      {
        username: "admin",
        passwordHash: User.hashPassword("admin123"),
        email: "admin@example.com",
        firstName: "Admin",
        lastName: "User",
        bio: "System administrator and music curator. Testing all the features!",
        avatarURL:
          "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
      },
      {
        username: "user1",
        passwordHash: User.hashPassword("user111"),
        email: "user1@example.com",
        firstName: "Alex",
        lastName: "Johnson",
        bio: "Hip-hop enthusiast and night owl. Always looking for the next great beat.",
        avatarURL:
          "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
      },
      {
        username: "user2",
        passwordHash: User.hashPassword("user222"),
        email: "user2@example.com",
        firstName: "Sarah",
        lastName: "Chen",
        bio: "Throwback music lover and study playlist curator. 2000s hits are my specialty!",
        avatarURL:
          "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
      },
      {
        username: "user3",
        passwordHash: User.hashPassword("user333"),
        email: "user3@example.com",
        firstName: "Mike",
        lastName: "Rodriguez",
        bio: "Gaming music expert and energy boost specialist. Let's get hyped!",
        avatarURL:
          "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
      },
      {
        username: "user4",
        passwordHash: User.hashPassword("user444"),
        email: "user4@example.com",
        firstName: "Taylor",
        lastName: "Kim",
        bio: "Chill vibes and feel-good music curator. Here to boost your mood with great tunes.",
        avatarURL:
          "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face",
      },
    ]);

    const followData = [
      // Admin follows user1, user2, user3, user4
      { follower_id: users[0].id, following_id: users[1].id },
      { follower_id: users[0].id, following_id: users[2].id },
      { follower_id: users[0].id, following_id: users[3].id },
      { follower_id: users[0].id, following_id: users[4].id },

      // user1 follows admin, user2, user3, user4
      { follower_id: users[1].id, following_id: users[0].id },
      { follower_id: users[1].id, following_id: users[2].id },
      { follower_id: users[1].id, following_id: users[3].id },
      { follower_id: users[1].id, following_id: users[4].id },

      // user2 follows admin, user1, user3, user4
      { follower_id: users[2].id, following_id: users[0].id },
      { follower_id: users[2].id, following_id: users[1].id },
      { follower_id: users[2].id, following_id: users[3].id },
      { follower_id: users[2].id, following_id: users[4].id },

      // user3 follows admin, user1, user2, user4
      { follower_id: users[3].id, following_id: users[0].id },
      { follower_id: users[3].id, following_id: users[1].id },
      { follower_id: users[3].id, following_id: users[2].id },
      { follower_id: users[3].id, following_id: users[4].id },

      // user4 follows admin, user1, user2, user3
      { follower_id: users[4].id, following_id: users[0].id },
      { follower_id: users[4].id, following_id: users[1].id },
      { follower_id: users[4].id, following_id: users[2].id },
      { follower_id: users[4].id, following_id: users[3].id },
    ];

    await Follows.bulkCreate(followData);
    console.log(`✅ Created ${followData.length} follow relationships`);

    console.log(`👤 Created ${users.length} users`);

    const posts = await Posts.bulkCreate([
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
        isPublic: false,
        likesCount: 0,
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
        isPublic: true,
        likesCount: 23,
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
        isPublic: false,
        likesCount: 0,
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
        isPublic: true,
        likesCount: 45,
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
        isPublic: true,
        likesCount: 18,
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
        isPublic: true,
        likesCount: 67,
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
        isPublic: true,
        likesCount: 89,
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
        isPublic: true,
        likesCount: 34,
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
        isPublic: true,
        likesCount: 112,
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
        isPublic: true,
        likesCount: 28,
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
        isPublic: true,
        likesCount: 156,
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
        isPublic: true,
        likesCount: 73,
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
        isPublic: true,
        likesCount: 41,
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
        isPublic: true,
        likesCount: 91,
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
        isPublic: true,
        likesCount: 64,
      },

      // User 4
      {
        title: "Late Night Chill",
        description: "This playlist puts me to sleep (in a good way).",
        status: "published",
        userId: 4,
        spotifyId: "37i9dQZF1DWVzZlRWgqAGH",
        spotifyType: "playlist",
        spotifyEmbedUrl:
          "https://open.spotify.com/embed/playlist/37i9dQZF1DWVzZlRWgqAGH",
        isPublic: true,
        likesCount: 37,
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
        isPublic: true,
        likesCount: 82,
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
        isPublic: true,
        likesCount: 105,
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
        isPublic: true,
        likesCount: 127,
      },
    ]);

    console.log(`📝 Created ${posts.length} posts`);

    const comments = await Comments.bulkCreate([
      {
        post_id: 1,
        user_id: 2,
        content: "Love this admin vibe! Great selection of tracks.",
        parent_id: null,
      },
      {
        post_id: 1,
        user_id: 3,
        content: "Admin always has the best music taste!",
        parent_id: null,
      },
      {
        post_id: 2,
        user_id: 4,
        content: "This lo-fi playlist is perfect for work. Thanks for sharing!",
        parent_id: null,
      },
      {
        post_id: 2,
        user_id: 1,
        content: "Thanks! I use this every day while coding.",
        parent_id: 3,
      },
      {
        post_id: 6,
        user_id: 1,
        content: "Late night drives with this track hit different 🚗",
        parent_id: null,
      },
      {
        post_id: 6,
        user_id: 3,
        content: "Totally agree! Perfect vibe for cruising.",
        parent_id: 5,
      },
      {
        post_id: 11,
        user_id: 2,
        content: "2000s hits are the best! This takes me back.",
        parent_id: null,
      },
    ]);

    console.log(`💬 Created ${comments.length} comments`);

    const notifications = await Notification.bulkCreate([
      // User 1 gets notified that User 2 commented on their post (id:1)
      {
        userId: 1,
        fromUserId: 2,
        type: "comment",
        postId: 1,
        commentId: 1,
        content: "Love this admin vibe! Great selection of tracks.",
        seen: false,
      },
      // User 1 gets notified that User 3 commented on their post (id:1)
      {
        userId: 1,
        fromUserId: 3,
        type: "comment",
        postId: 1,
        commentId: 2,
        content: "Admin always has the best music taste!",
        seen: false,
      },
      // User 2 gets notified that User 4 commented on their post (id:2)
      {
        userId: 2,
        fromUserId: 4,
        type: "comment",
        postId: 2,
        commentId: 3,
        content: "This lo-fi playlist is perfect for work. Thanks for sharing!",
        seen: false,
      },
      // User 2 gets notified that User 1 replied to comment 3
      {
        userId: 2,
        fromUserId: 1,
        type: "comment",
        postId: 2,
        commentId: 4,
        content: "Thanks! I use this every day while coding.",
        seen: false,
      },
      // User 6’s owner (let’s say User 4) gets notified that User 1 commented
      {
        userId: 4,
        fromUserId: 1,
        type: "comment",
        postId: 6,
        commentId: 5,
        content: "Late night drives with this track hit different 🚗",
        seen: false,
      },
      // User 4 gets notified that User 3 replied to comment 5
      {
        userId: 4,
        fromUserId: 3,
        type: "comment",
        postId: 6,
        commentId: 6,
        content: "Totally agree! Perfect vibe for cruising.",
        seen: false,
      },
      // User 5’s owner (say User 1) gets notified that User 2 commented
      {
        userId: 1,
        fromUserId: 2,
        type: "comment",
        postId: 11,
        commentId: 7,
        content: "2000s hits are the best! This takes me back.",
        seen: false,
      },
      // Extra: simulate a follow event
      {
        userId: 1,
        fromUserId: 3,
        type: "new_follower",
        seen: false,
      },
      // Extra: simulate a post like
      {
        userId: 2,
        fromUserId: 4,
        type: "post_liked",
        postId: 6,
        seen: false,
      },
    ]);

    console.log(`🔔 Created ${notifications.length} notifications`);

    console.log("🌱 Seeded the database successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  } finally {
    db.close();
  }
};

seed();
