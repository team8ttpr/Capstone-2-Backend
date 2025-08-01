const { DataTypes } = require("sequelize");
const db = require("./db"); // your Sequelize instance

const Posts = db.define("posts", {
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [3, 100],
    },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM("draft", "published"),
    allowNull: false,
    defaultValue: "draft",
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
});

module.exports = Posts;
