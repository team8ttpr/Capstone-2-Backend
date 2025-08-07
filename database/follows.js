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
      fields: ['follower_id', 'following_id'] // Use snake_case here
    }
  ]
});

module.exports = Follows;