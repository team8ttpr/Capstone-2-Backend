const { db, User, Posts, Follows } = require("./index");

const seed = async () => {
  try {
    db.logging = false;
    console.log("🔄 Syncing database...");
    await db.sync({ force: true }); 
    
    console.log("🌱 Starting database seed...");

    const users = await User.bulkCreate([
      { 
        id: 1, 
        username: "admin", 
        passwordHash: User.hashPassword("admin123"),
        email: "admin@example.com",
        firstName: "Admin",
        lastName: "User",
        bio: "System administrator and music curator. Testing all the features!",
        avatarURL: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
      },
      { 
        id: 2, 
        username: "user1", 
        passwordHash: User.hashPassword("user111"),
        email: "user1@example.com",
        firstName: "Alex",
        lastName: "Johnson",
        bio: "Hip-hop enthusiast and night owl. Always looking for the next great beat.",
        avatarURL: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
      },
      { 
        id: 3, 
        username: "user2", 
        passwordHash: User.hashPassword("user222"),
        email: "user2@example.com",
        firstName: "Sarah",
        lastName: "Chen",
        bio: "Throwback music lover and study playlist curator. 2000s hits are my specialty!",
        avatarURL: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face"
      },
      { 
        id: 4, 
        username: "user3", 
        passwordHash: User.hashPassword("user333"),
        email: "user3@example.com",
        firstName: "Mike",
        lastName: "Rodriguez",
        bio: "Gaming music expert and energy boost specialist. Let's get hyped!",
        avatarURL: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face"
      },
      { 
        id: 5, 
        username: "user4", 
        passwordHash: User.hashPassword("user444"),
        email: "user4@example.com",
        firstName: "Taylor",
        lastName: "Kim",
        bio: "Chill vibes and feel-good music curator. Here to boost your mood with great tunes.",
        avatarURL: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face"
      },
    ], {
      returning: true
    });

    console.log(`👤 Created ${users.length} users`);

    const posts = await Posts.bulkCreate([
      {
        title: "Admin Vibes",
        description: "Admin is testing things. This is a draft post to test the draft functionality.",
        status: "draft",
        userId: 1,
        spotifyId: "37i9dQZF1DXcBWIGoYBM5M",
        spotifyType: "playlist",
        spotifyEmbedUrl: "https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M",
        isPublic: false,
        likesCount: 0
      },
      {
        title: "Lo-Fi Work Flow",
        description: "Perfect background music for coding sessions. These beats keep me focused without being distracting. Perfect for those long development marathons!",
        status: "published",
        userId: 1,
        spotifyId: "37i9dQZF1DXdPec7aLTmlC",
        spotifyType: "playlist",
        spotifyEmbedUrl: "https://open.spotify.com/embed/playlist/37i9dQZF1DXdPec7aLTmlC",
        isPublic: true,
        likesCount: 23
      },
      {
        title: "Rock & Roll!",
        description: "Classic rock hits I love. Still working on this playlist, adding more gems as I find them.",
        status: "draft",
        userId: 1,
        spotifyId: "37i9dQZF1DWXRqgorJj26U",
        spotifyType: "playlist",
        spotifyEmbedUrl: "https://open.spotify.com/embed/playlist/37i9dQZF1DWXRqgorJj26U",
        isPublic: false,
        likesCount: 0
      },
      {
        title: "Motivation Boost",
        description: "Hype music to crush the day. When you need that extra push to get things done, this track delivers!",
        status: "published",
        userId: 1,
        spotifyId: "7qiZfU4dY1lWllzX7mPBI3",
        spotifyType: "track",
        spotifyEmbedUrl: "https://open.spotify.com/embed/track/7qiZfU4dY1lWllzX7mPBI3",
        isPublic: true,
        likesCount: 45
      },
      {
        title: "Calm Mornings",
        description: "Wake up gently with these soothing sounds. Perfect for those slow weekend mornings with coffee.",
        status: "published",
        userId: 1,
        spotifyId: "3KkXRkHbMCARz0aVfEt68P",
        spotifyType: "track",
        spotifyEmbedUrl: "https://open.spotify.com/embed/track/3KkXRkHbMCARz0aVfEt68P",
        isPublic: true,
        likesCount: 18
      },

      {
        title: "Late Night Drive",
        description: "Vibes for cruising through the city when the streets are empty. Nothing beats these smooth beats at 2 AM.",
        status: "published",
        userId: 2,
        spotifyId: "6habFhsOp2NvshLv26DqMb",
        spotifyType: "track",
        spotifyEmbedUrl: "https://open.spotify.com/embed/track/6habFhsOp2NvshLv26DqMb",
        isPublic: true,
        likesCount: 67
      },
      {
        title: "Hip-Hop Energy",
        description: "Stay pumped with these fresh beats. Current favorites that keep me moving throughout the day.",
        status: "published",
        userId: 2,
        spotifyId: "37i9dQZF1DX0XUsuxWHRQd",
        spotifyType: "playlist",
        spotifyEmbedUrl: "https://open.spotify.com/embed/playlist/37i9dQZF1DX0XUsuxWHRQd",
        isPublic: true,
        likesCount: 89
      },
      {
        title: "The Weekend Wave",
        description: "Weekend vibes incoming! This track just hits different when Friday night rolls around.",
        status: "published",
        userId: 2,
        spotifyId: "3U4isOIWM3VvDubwSI3y7a",
        spotifyType: "track",
        spotifyEmbedUrl: "https://open.spotify.com/embed/track/3U4isOIWM3VvDubwSI3y7a",
        isPublic: true,
        likesCount: 34
      },
      {
        title: "Pop Culture Hits",
        description: "All the trending pop songs that everyone's talking about. Stay current with these bangers!",
        status: "published",
        userId: 2,
        spotifyId: "37i9dQZF1DXcF6B6QPhFDv",
        spotifyType: "playlist",
        spotifyEmbedUrl: "https://open.spotify.com/embed/playlist/37i9dQZF1DXcF6B6QPhFDv",
        isPublic: true,
        likesCount: 112
      },
      {
        title: "Mellow Mood",
        description: "For rainy evenings when you need something soft and contemplative. Perfect with a cup of tea.",
        status: "published",
        userId: 2,
        spotifyId: "2Fxmhks0bxGSBdJ92vM42m",
        spotifyType: "track",
        spotifyEmbedUrl: "https://open.spotify.com/embed/track/2Fxmhks0bxGSBdJ92vM42m",
        isPublic: true,
        likesCount: 28
      },

      {
        title: "Throwback Thursday",
        description: "Hits from the 2000s that still slap today! Nothing beats the nostalgia of these classics.",
        status: "published",
        userId: 3,
        spotifyId: "37i9dQZF1DWYmmr74INQlb",
        spotifyType: "playlist",
        spotifyEmbedUrl: "https://open.spotify.com/embed/playlist/37i9dQZF1DWYmmr74INQlb",
        isPublic: true,
        likesCount: 156
      },
      {
        title: "Study Mode On",
        description: "Helps me focus during those long study sessions. Instrumental vibes that don't distract from the work.",
        status: "published",
        userId: 3,
        spotifyId: "37i9dQZF1DX8Uebhn9wzrS",
        spotifyType: "playlist",
        spotifyEmbedUrl: "https://open.spotify.com/embed/playlist/37i9dQZF1DX8Uebhn9wzrS",
        isPublic: true,
        likesCount: 73
      },
      {
        title: "Classic Chill",
        description: "Old school but gold. Sometimes you need to appreciate the timeless tracks that started it all.",
        status: "published",
        userId: 3,
        spotifyId: "6QgjcU0zLnzq5OrUoSZ3OK",
        spotifyType: "track",
        spotifyEmbedUrl: "https://open.spotify.com/embed/track/6QgjcU0zLnzq5OrUoSZ3OK",
        isPublic: true,
        likesCount: 41
      },
      {
        title: "Top Gaming Tracks",
        description: "Perfect for grinding ranked matches. These beats keep the energy high during those intense gaming sessions.",
        status: "published",
        userId: 3,
        spotifyId: "37i9dQZF1DX2sUQwD7tbmL",
        spotifyType: "playlist",
        spotifyEmbedUrl: "https://open.spotify.com/embed/playlist/37i9dQZF1DX2sUQwD7tbmL",
        isPublic: true,
        likesCount: 91
      },
      {
        title: "Energy Boost",
        description: "Turn it up! When you need that extra motivation to power through anything life throws at you.",
        status: "published",
        userId: 3,
        spotifyId: "4uLU6hMCjMI75M1A2tKUQC",
        spotifyType: "track",
        spotifyEmbedUrl: "https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC",
        isPublic: true,
        likesCount: 64
      },

      {
        title: "Late Night Chill",
        description: "This playlist puts me to sleep (in a good way). Perfect for winding down after a long day.",
        status: "published",
        userId: 4,
        spotifyId: "37i9dQZF1DWVzZlRWgqAGH",
        spotifyType: "playlist",
        spotifyEmbedUrl: "https://open.spotify.com/embed/playlist/37i9dQZF1DWVzZlRWgqAGH",
        isPublic: true,
        likesCount: 37
      },
      {
        title: "Favorite Banger",
        description: "Crank it loud! This track never fails to get me hyped up and ready for anything.",
        status: "published",
        userId: 4,
        spotifyId: "0eGsygTp906u18L0Oimnem",
        spotifyType: "track",
        spotifyEmbedUrl: "https://open.spotify.com/embed/track/0eGsygTp906u18L0Oimnem",
        isPublic: true,
        likesCount: 82
      },
      {
        title: "Feel Good Mix",
        description: "This always boosts my mood no matter what kind of day I'm having. Guaranteed smile maker!",
        status: "published",
        userId: 4,
        spotifyId: "37i9dQZF1DXdPec7aLTmlC",
        spotifyType: "playlist",
        spotifyEmbedUrl: "https://open.spotify.com/embed/playlist/37i9dQZF1DXdPec7aLTmlC",
        isPublic: true,
        likesCount: 105
      },
      {
        title: "Bop Playlist 💿",
        description: "My current favorite finds. Trust me, these tracks are absolute fire and you need them in your life!",
        status: "published",
        userId: 4,
        spotifyId: "37i9dQZF1DXcBWIGoYBM5M",
        spotifyType: "playlist",
        spotifyEmbedUrl: "https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M",
        isPublic: true,
        likesCount: 127
      },
    ], {
      returning: true
    });

    console.log(`📝 Created ${posts.length} posts`);

    const follows = await Follows.bulkCreate([
      { followerId: 1, followingId: 2 },
      { followerId: 1, followingId: 3 }, 
      { followerId: 2, followingId: 1 },
      { followerId: 2, followingId: 4 },
      { followerId: 3, followingId: 1 }, 
      { followerId: 3, followingId: 2 }, 
      { followerId: 3, followingId: 5 }, 
      { followerId: 4, followingId: 2 },
      { followerId: 4, followingId: 3 },
      { followerId: 5, followingId: 1 },
      { followerId: 5, followingId: 3 },
      { followerId: 5, followingId: 4 },
    ]);

    console.log(`🔗 Created ${follows.length} follow relationships`);

    console.log("🎉 Database seeded successfully!");
    console.log("\n📊 Seed Summary:");
    console.log(`   👥 Users: ${users.length}`);
    console.log(`   📝 Posts: ${posts.filter(p => p.status === 'published').length} published, ${posts.filter(p => p.status === 'draft').length} drafts`);
    console.log(`   🔗 Follows: ${follows.length}`);
    
    console.log("\n🔐 Test Login Credentials:");
    console.log("   Username: admin | Password: admin123");
    console.log("   Username: user1 | Password: user111");
    console.log("   Username: user2 | Password: user222");
    console.log("   Username: user3 | Password: user333");
    console.log("   Username: user4 | Password: user444");

  } catch (error) {
    console.error("❌ Error seeding database:", error);
    if (error.name === 'SequelizeValidationError') {
      error.errors.forEach(err => {
        console.error(`   - ${err.path}: ${err.message}`);
      });
    }
    if (error.name === 'SequelizeUniqueConstraintError') {
      console.error(`   - Unique constraint error: ${error.message}`);
    }
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      console.error(`   - Foreign key constraint error: ${error.message}`);
    }
  } finally {
    await db.close();
    process.exit(0);
  }
};

seed();