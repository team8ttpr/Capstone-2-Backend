const { DataTypes } = require("sequelize");
const sequelize = require("./db");
const User = require("./user");

const Message = sequelize.define("message", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  senderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: "sender_id",
    references: { model: "users", key: "id" },
  },
  receiverId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: "receiver_id",
    references: { model: "users", key: "id" },
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "text",
  },
  fileUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    field: "file_url",
  },
  read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  timestamps: true,
  tableName: "messages",
  underscored: true,
});

module.exports = Message;