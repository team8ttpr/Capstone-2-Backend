const { DataTypes } = require("sequelize");
const db = require("./db");

const Posts = db.define("posts", {
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [1, 200], 
    },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM("draft", "published"),
    allowNull: false,
    defaultValue: "draft",
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: "user_id",
    references: {
      model: "users",
      key: "id",
    },
  },
  spotifyTrackId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: "spotify_track_id",
  },
  spotifyTrackName: {
    type: DataTypes.STRING,
    allowNull: true,
    field: "spotify_track_name",
  },
  spotifyArtistName: {
    type: DataTypes.STRING,
    allowNull: true,
    field: "spotify_artist_name",
  },
  likesCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: "likes_count",
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: "is_public",
  },
}, {
  tableName: "posts",
  underscored: true,
});

module.exports = Posts;

