const { DataTypes } = require("sequelize");
const db = require("./db");
const bcrypt = require("bcrypt");

const User = db.define("user", {
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      len: [3, 20],
    },
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  auth0Id: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    field: 'auth0_id'
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'password_hash'
  },
  spotifyId: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    field: 'spotify_id'
  },
  spotifyAccessToken: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'spotify_access_token'
  },
  spotifyRefreshToken: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'spotify_refresh_token'
  },
  spotifyTokenExpiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'spotify_token_expires_at'
  },
  spotifyDisplayName: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'spotify_display_name'
  },
  spotifyProfileImage: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'spotify_profile_image'
  },
}, {
  tableName: 'users',
  underscored: true // Ensures snake_case column names
});

User.prototype.checkPassword = function (password) {
  if (!this.passwordHash) {
    return false;
  }
  return bcrypt.compareSync(password, this.passwordHash);
};

User.hashPassword = function (password) {
  return bcrypt.hashSync(password, 10);
};

User.prototype.isSpotifyTokenValid = function () {
  return this.spotifyAccessToken && 
         this.spotifyTokenExpiresAt && 
         new Date() < this.spotifyTokenExpiresAt;
};

module.exports = User;