const { DataTypes } = require("sequelize");
const db = require("./db");

const UserProfileSticker = db.define("user_profile_sticker", {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  stickerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'sticker_id',
    references: {
      model: 'stickers',
      key: 'id'
    }
  },
  positionX: {
    type: DataTypes.FLOAT,
    allowNull: false,
    field: 'position_x',
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100 
    }
  },
  positionY: {
    type: DataTypes.FLOAT,
    allowNull: false,
    field: 'position_y',
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100 // (0-100%)
    }
  },
  scale: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 1.0,
    validate: {
      min: 0.1,
      max: 5.0 // 10%- 500%
    }
  },
  rotation: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 360 //rotate degrees
    }
  },
  zIndex: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'z_index',
    defaultValue: 1,
    validate: {
      min: 1,
      max: 999 // Layering order
    }
  }
}, {
  tableName: 'user_profile_stickers',
  underscored: true,
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['sticker_id']
    },
    {
      fields: ['user_id', 'sticker_id'],
      unique: false // allow multiple of same sticker on profile
    },
    {
      fields: ['user_id', 'z_index']
    }
  ]
});

module.exports = UserProfileSticker;
