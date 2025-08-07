const { db, User, Posts, Follows } = require("./index");

const seedDatabase = async () => {
  try {
    // Sync database
    console.log("🔄 Syncing database...");
    await db.sync({ force: false, alter: true });
    
    console.log("🌱 Starting database seed...");

    // Clear existing data in correct order (to handle foreign key constraints)
    await Posts.destroy({ where: {} });
    await Follows.destroy({ where: {} });
    await User.destroy({ where: {} });

    // Create test users
    const users = await User.bulkCreate([
      {
        username: "musiclover92",
        email: "sarah@example.com",
        passwordHash: User.hashPassword("password123"),
        firstName: "Sarah",
        lastName: "Johnson",
        bio: "Love discovering new music and sharing my favorites! Always on the hunt for new artists and hidden gems.",
        spotifyDisplayName: "Sarah Johnson",
        profileImage: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
        avatarURL: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face"
      },
      {
        username: "vinylcollector",
        email: "mike@example.com",
        passwordHash: User.hashPassword("password123"),
        firstName: "Mike",
        lastName: "Chen",
        bio: "Vinyl enthusiast and classic rock aficionado. Always hunting for rare records and sharing the stories behind the music.",
        spotifyDisplayName: "Mike Chen",
        profileImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
        avatarURL: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
      },
      {
        username: "jazzcat",
        email: "alex@example.com",
        passwordHash: User.hashPassword("password123"),
        firstName: "Alex",
        lastName: "Rivera",
        bio: "Jazz musician and music producer. Sharing smooth vibes and hidden gems from the world of jazz and beyond.",
        spotifyDisplayName: "Alex Rivera",
        profileImage: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
        avatarURL: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
      },
      {
        username: "indierocks",
        email: "taylor@example.com",
        passwordHash: User.hashPassword("password123"),
        firstName: "Taylor",
        lastName: "Swift",
        bio: "Indie rock enthusiast and concert photographer. Living for live music experiences and discovering the next big thing.",
        spotifyDisplayName: "Taylor Swift",
        profileImage: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
        avatarURL: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face"
      }
    ], {
      returning: true
    });

    console.log(`✅ Created ${users.length} users`);

    // Create test posts
    const posts = await Posts.bulkCreate([
      {
        title: "Just discovered this amazing track!",
        description: "This song has been on repeat all day. The production quality is insane and the vocals are so smooth. Definitely adding this to my workout playlist. What do you think about this artist?",
        userId: users[0].id,
        status: 'published',
        isPublic: true,
        spotifyId: "4iV5W9uYEdYUVa79Axb7Rh",
        spotifyType: "track",
        likesCount: 42
      },
      {
        title: "Throwback vibes with this classic album",
        description: "Sometimes you just need to go back to the classics. This album shaped my entire music taste growing up. Every single track is a masterpiece. Perfect for those late night study sessions or just chilling with friends.",
        userId: users[1].id,
        status: 'published',
        isPublic: true,
        spotifyId: "1DFixLWuPkv3KT3TnV35m3",
        spotifyType: "album",
        likesCount: 127
      },
      {
        title: "Smooth jazz for your Sunday morning",
        description: "Found this incredible jazz playlist that's perfect for lazy Sunday mornings. The saxophone solos are absolutely divine. Great for coffee and contemplation.",
        userId: users[2].id,
        status: 'published',
        isPublic: true,
        spotifyId: "37i9dQZF1DX0SM0LYsmbMT",
        spotifyType: "playlist",
        likesCount: 89
      },
      {
        title: "This indie band is going places",
        description: "Stumbled upon this artist at a local venue last night and I'm blown away. Their sound is so unique and fresh. They're definitely going to be huge soon. Check them out before they blow up!",
        userId: users[3].id,
        status: 'published',
        isPublic: true,
        spotifyId: "3TVXtAsR1Inumwj472S9r4",
        spotifyType: "artist",
        likesCount: 156
      },
      {
        title: "Perfect study playlist",
        description: "Curated the perfect instrumental playlist for deep focus sessions. No lyrics to distract, just pure musical flow to keep you in the zone.",
        userId: users[0].id,
        status: 'published',
        isPublic: true,
        spotifyId: "37i9dQZF1DWWQRwui0ExPn",
        spotifyType: "playlist",
        likesCount: 73
      },
      {
        title: "Draft post for later",
        description: "Working on this post about my favorite underground hip-hop artists...",
        userId: users[1].id,
        status: 'draft',
        isPublic: false,
        likesCount: 0
      }
    ], {
      returning: true
    });

    console.log(`✅ Created ${posts.length} posts`);

    // Create some follow relationships
    const follows = await Follows.bulkCreate([
      { followerId: users[0].id, followingId: users[1].id },
      { followerId: users[0].id, followingId: users[2].id },
      { followerId: users[1].id, followingId: users[0].id },
      { followerId: users[1].id, followingId: users[3].id },
      { followerId: users[2].id, followingId: users[0].id },
      { followerId: users[2].id, followingId: users[3].id },
      { followerId: users[3].id, followingId: users[1].id },
      { followerId: users[3].id, followingId: users[2].id }
    ]);

    console.log(`✅ Created ${follows.length} follow relationships`);

    console.log("🎉 Database seeded successfully!");
    console.log("\n📊 Seed Summary:");
    console.log(`   👥 Users: ${users.length}`);
    console.log(`   📝 Posts: ${posts.filter(p => p.status === 'published').length} published, ${posts.filter(p => p.status === 'draft').length} drafts`);
    console.log(`   🔗 Follows: ${follows.length}`);
    
    console.log("\n🔐 Test Login Credentials:");
    users.forEach(user => {
      console.log(`   Username: ${user.username} | Password: password123`);
    });

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

seedDatabase();