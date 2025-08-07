const db = require("./db");
const User = require("./user");
const Posts = require("./posts");

// Define associations
User.hasMany(Posts, { 
  foreignKey: 'userId',
  as: 'posts'
});

Posts.belongsTo(User, { 
  foreignKey: 'userId',
  as: 'author'
});

// Create Follows table if it doesn't exist
const { DataTypes } = require("sequelize");

const Follows = db.define("follows", {
  followerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  followingId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  }
}, {
  tableName: 'follows',
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['follower_id', 'following_id']
    }
  ]
});

// Define Follows associations
User.belongsToMany(User, {
  through: Follows,
  foreignKey: 'followerId',
  otherKey: 'followingId',
  as: 'following'
});

User.belongsToMany(User, {
  through: Follows,
  foreignKey: 'followingId',
  otherKey: 'followerId',
  as: 'followers'
});

module.exports = { db, User, Posts, Follows };