const db = require("./db");
const User = require("./user");
const Posts = require("./posts");
const Follows = require("./follows");
const Sticker = require("./sticker");
const UserProfileSticker = require("./userProfileSticker");

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
  foreignKey: "follower_id",
  as: "follower",
});

Follows.belongsTo(User, {
  foreignKey: "following_id",
  as: "following",
});

// Sticker associations
User.hasMany(Sticker, {
  foreignKey: "uploaded_by",
  as: "uploadedStickers",
});

Sticker.belongsTo(User, {
  foreignKey: "uploaded_by",
  as: "uploader",
});

// UserProfileSticker associations
User.hasMany(UserProfileSticker, {
  foreignKey: "user_id",
  as: "profileStickers",
});

Sticker.hasMany(UserProfileSticker, {
  foreignKey: "sticker_id",
  as: "usages",
});

UserProfileSticker.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

UserProfileSticker.belongsTo(Sticker, {
  foreignKey: "sticker_id",
  as: "sticker",
});

// Many-to-many relationship through UserProfileSticker
User.belongsToMany(Sticker, {
  through: UserProfileSticker,
  as: "stickers",
  foreignKey: "user_id",
  otherKey: "sticker_id",
});

Sticker.belongsToMany(User, {
  through: UserProfileSticker,
  as: "users",
  foreignKey: "sticker_id",
  otherKey: "user_id",
});

module.exports = {
  db,
  User,
  Posts,
  Follows,
  Sticker,
  UserProfileSticker,
};
