const { DataTypes } = require("sequelize");
const db = require("./db");

const Follows = db.define("follows", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  followerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'follower_id', // Map to snake_case database column
    references: {
      model: 'users',
      key: 'id'
    }
  },
  followingId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'following_id', // Map to snake_case database column
    references: {
      model: 'users', 
      key: 'id'
    }
  }
}, {
  tableName: 'follows',
  underscored: true, // This ensures snake_case column names
  // Ensure a user can't follow the same person twice
  indexes: [
    {
      unique: true,
      fields: ['follower_id', 'following_id'] // Use snake_case here
    }
  ]
});

module.exports = Follows;