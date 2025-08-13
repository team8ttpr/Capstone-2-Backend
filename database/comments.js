const { DataTypes } = require("sequelize");
const db = require("./db");

const Comments = db.define(
  "comments",
  {
    id: { 
      type: DataTypes.INTEGER, 
      primaryKey: true, 
      autoIncrement: true 
    },
    post_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "posts", key: "id" },
      onDelete: "CASCADE",
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    parent_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "comments", key: "id" },
      onDelete: "CASCADE",
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    tableName: "comments",
    underscored: true,
    indexes: [
      { fields: ["post_id", "created_at"] },
      { fields: ["parent_id"] },
    ],
  }
);

module.exports = Comments;