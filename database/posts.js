const { DataTypes } = require("sequelize");
const db = require("./db");
const bcrypt = require("bcrypt");

const Post = db.define("post", {
  title: {
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
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  role: {
    type: DataTypes.ENUM("User", "Admin"),
    defaultValue: "User",
    allowNull: false,
  },
});

// Instance method to check password
User.prototype.checkPassword = function (password) {
  if (!this.passwordHash) {
    return false; // Auth0 users don't have passwords
  }
  return bcrypt.compareSync(password, this.passwordHash);
};

// Class method to hash password
User.hashPassword = function (password) {
  return bcrypt.hashSync(password, 10);
};

// Method to check if Spotify token is valid
User.prototype.isSpotifyTokenValid = function () {
  return (
    this.spotifyAccessToken &&
    this.spotifyTokenExpiresAt &&
    new Date() < this.spotifyTokenExpiresAt
  );
};

module.exports = User;
