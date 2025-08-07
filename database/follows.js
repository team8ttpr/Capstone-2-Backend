const { DataTypes } = require("sequelize");
const db = require("./db");

const Follows = db.define("follows", {
  followerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'follower_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  followingId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'following_id',
    references: {
      model: 'users',
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
    },
    {
      fields: ['follower_id']
    },
    {
      fields: ['following_id']
    }
  ]
});

module.exports = Follows;