const { DataTypes } = require("sequelize");
const db = require("./db"); // your Sequelize instance

const Posts = db.define("posts", {
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [3, 100],
    },
  },
  description: {
    type: DataTypes.TEXT,
  content: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id', // Map to snake_case
    references: {
      model: 'users',
      key: 'id'
    }
  },
  spotifyTrackId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM("draft", "published"),
    allowNull: false,
    defaultValue: "draft",
    field: 'spotify_track_id'
  },
  spotifyTrackName: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'spotify_track_name'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
});

module.exports = Posts;

  spotifyArtistName: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'spotify_artist_name'
  },
  likesCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'likes_count'
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_public'
  }
}, {
  tableName: 'posts',
  underscored: true // Ensures snake_case column names
});

module.exports = Post;