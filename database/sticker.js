const { DataTypes } = require("sequelize");
const db = require("./db");

const Sticker = db.define("sticker", {
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'image_url',
    validate: {
      notEmpty: true,
      len: [1, 500]
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 100]
    }
  },
  type: {
    type: DataTypes.ENUM('preset', 'custom'),
    allowNull: false,
    defaultValue: 'preset'
  },
  uploaderId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'uploader_id',
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'stickers',
  underscored: true,
  indexes: [
    {
      fields: ['type']
    },
    {
      fields: ['uploader_id']
    }
  ]
});

module.exports = Sticker;
