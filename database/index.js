const db = require("./db");
const User = require("./user");
const Posts = require("./posts");
const Follows = require("./follows");

User.hasMany(Posts, {
  foreignKey: "user_id",
  as: "posts",
});

Posts.belongsTo(User, {
  foreignKey: "user_id",
  as: "author",
});

User.belongsToMany(User, {
  through: Follows,
  as: "following",
  foreignKey: "follower_id",
  otherKey: "following_id",
});

User.belongsToMany(User, {
  through: Follows,
  as: "followers",
  foreignKey: "following_id",
  otherKey: "follower_id",
});

Follows.belongsTo(User, {
  foreignKey: 'follower_id',
  as: 'follower'
});

Follows.belongsTo(User, {
  foreignKey: 'following_id',
  as: 'following'
});

module.exports = {
  db,
  User,
  Posts,
  Follows,
};