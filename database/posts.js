const { DataTypes } = require("sequelize");
const db = require("./db");

const Posts = db.define("poats", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
  },

  title: {
    type: DataTypes.STRING,
  },

  body: {
    type: DataTypes.TEXT,
  },

  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },

  status: {
    type: DataTypes.STRING,
  },

  created_at: {
    type: DataTypes.INTEGER,
  },
});

module.exports = Posts;
