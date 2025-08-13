const { DataTypes } = require("sequelize");
const db = require("./db");

const PostLike = db.define("PostLike", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  postId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  }
}, {
  indexes: [
    {
      unique: true,
      fields: ['postId', 'userId']
    }
  ]
});

module.exports = PostLike;