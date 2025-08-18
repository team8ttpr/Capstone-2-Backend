// database/notifications.js
const { DataTypes } = require("sequelize");
const db = require("./db");

const Notification = db.define(
  "notifications",
  {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false, // recipient
    },
    fromUserId: {
      type: DataTypes.INTEGER,
      allowNull: false, // actor
    },
    type: {
      type: DataTypes.ENUM("new_follower", "post_liked", "comment"),
      allowNull: false,
    },
    postId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    commentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    seen: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: "notifications",
    underscored: true, // created_at, updated_at
  }
);

// We’ll hook associations in database/index.js where all models are available
module.exports = Notification;
