const { DataTypes } = require("sequelize");
const db = require("./db");

const Follows = db.define("follows", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
  },

  following_user_id: {
    type: DataTypes.INTEGER,
  },
  follows_user_id: {
    type: DataTypes.INTEGER,
  },
  follows_user_id: {
    type: DataTypes.INTEGER,
  },
  created_at: {
    type: DataTypes.INTEGER,
  },
});

module.exports = Follows;
