// database/follows.js
const { DataTypes } = require("sequelize");
const db = require("./db");

const Follows = db.define(
  "follows",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    followerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "follower_id",
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    followingId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "following_id",
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
  },
  {
    tableName: "follows",
    underscored: true,
    indexes: [{ unique: true, fields: ["follower_id", "following_id"] }],
  }
);

module.exports = Follows;
