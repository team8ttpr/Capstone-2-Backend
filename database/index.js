const db = require("./db");
const User = require("./user");
const Posts = require("./posts");
const Follows = require("./follows");
const Sticker = require("./sticker");
const UserProfileSticker = require("./userProfileSticker");
const PostLike = require("./postLikes");
const Comments = require("./comments");
const Message = require("./messages");

User.hasMany(Posts, {
  foreignKey: "userId",
  as: "posts",
});

Posts.belongsTo(User, {
  foreignKey: "userId",
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

//Post Likes associations
Posts.hasMany(PostLike, { foreignKey: "postId", as: "likes" });
PostLike.belongsTo(Posts, { foreignKey: "postId", as: "post" });
User.hasMany(PostLike, { foreignKey: "userId", as: "userLikes" });
PostLike.belongsTo(User, { foreignKey: "userId", as: "user" });

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

// Comment associations 
Comments.belongsTo(User, { foreignKey: "user_id", as: "author" });
Comments.belongsTo(Posts, { foreignKey: "post_id", as: "post" });
Comments.belongsTo(Comments, { foreignKey: "parent_id", as: "parent" });
Comments.hasMany(Comments, { foreignKey: "parent_id", as: "replies" });

User.hasMany(Comments, { foreignKey: "user_id" });
Posts.hasMany(Comments, { foreignKey: "post_id" });

//message associations
Message.belongsTo(User, { as: "sender", foreignKey: "senderId" });
Message.belongsTo(User, { as: "receiver", foreignKey: "receiverId" });

User.hasMany(Message, { as: "sentMessages", foreignKey: "senderId" });
User.hasMany(Message, { as: "receivedMessages", foreignKey: "receiverId" });

module.exports = {
  db,
  User,
  Posts,
  Follows,
  Sticker,
  UserProfileSticker,
  PostLike,
  Comments,
  Message,
};