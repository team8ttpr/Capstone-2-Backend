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
      // Posts for admin
      {
        title: "Admin Post 1",
        description: "Admin is testing things.",
        status: "published",
        userId: 1,
      },
      {
        title: "Admin Post 2",
        description: "Another one by admin.",
        status: "draft",
        userId: 1,
      },
      {
        title: "Admin Post 3",
        description: "Admin's third post.",
        status: "published",
        userId: 1,
      },

      // Posts for user1
      {
        title: "User1's First",
        description: "Hello world!",
        status: "published",
        userId: 2,
      },
      {
        title: "User1's Second",
        description: "Testing stuff.",
        status: "draft",
        userId: 2,
      },
      {
        title: "User1's Third",
        description: "Still learning!",
        status: "published",
        userId: 2,
      },

      // Posts for user2
      {
        title: "Post by User2",
        description: "Yup, it's working.",
        status: "draft",
        userId: 3,
      },
      {
        title: "Second by User2",
        description: "Seeding is cool.",
        status: "published",
        userId: 3,
      },
      {
        title: "User2 Final",
        description: "Final test.",
        status: "draft",
        userId: 3,
      },

      // Posts for user3
      {
        title: "u3-1",
        description: "user3 post one",
        status: "published",
        userId: 4,
      },
      {
        title: "u3-2",
        description: "user3 post two",
        status: "draft",
        userId: 4,
      },
      {
        title: "u3-3",
        description: "user3 post three",
        status: "published",
        userId: 4,
      },

      // Posts for user4
      {
        title: "user4 test 1",
        description: "just a test",
        status: "draft",
        userId: 5,
      },
      {
        title: "user4 test 2",
        description: "testing more",
        status: "published",
        userId: 5,
      },
      {
        title: "user4 test 3",
        description: "this is it",
        status: "draft",
        userId: 5,
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
