const { DataTypes } = require("sequelize");
const db = require("./db");

const Sticker = db.define("sticker", {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 100]
    }
  },
  url: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 500]
    }
  },
  cloudinaryPublicId: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'cloudinary_public_id',
    validate: {
      notEmpty: true,
      len: [1, 200]
    }
  },
  type: {
    type: DataTypes.ENUM('preset', 'custom'),
    allowNull: false,
    defaultValue: 'preset'
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'general',
    validate: {
      len: [1, 50]
    }
  },
  uploadedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'uploaded_by',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  width: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  height: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  format: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  sizeBytes: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'size_bytes'
  }
}, {
  tableName: 'stickers',
  underscored: true,
  indexes: [
    {
      fields: ['type']
    },
    {
      fields: ['category']
    },
    {
      fields: ['uploaded_by']
    },
    {
      fields: ['type', 'category']
    }
  ]
});

module.exports = Sticker;
