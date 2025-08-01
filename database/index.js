const db = require("./db");
const User = require("./user");
const Post = require("./posts");
const Follows = require("./follows");

// Set up associations
User.hasMany(Post, { 
  foreignKey: 'user_id', // Use snake_case for foreign key
  as: 'posts' 
});

Post.belongsTo(User, { 
  foreignKey: 'user_id', // Use snake_case for foreign key
  as: 'author' 
});

// User following relationships
User.belongsToMany(User, {
  through: Follows,
  as: 'following',
  foreignKey: 'follower_id', // Use snake_case
  otherKey: 'following_id'   // Use snake_case
});

User.belongsToMany(User, {
  through: Follows,
  as: 'followers', 
  foreignKey: 'following_id', // Use snake_case
  otherKey: 'follower_id'     // Use snake_case
});

module.exports = {
  db,
  User,
  Post,
  Follows,
};