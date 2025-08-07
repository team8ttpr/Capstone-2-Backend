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
      notEmpty: true,
    },
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    validate: {
      isEmail: {
        msg: "Must be a valid email address"
      },
    },
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'first_name',
    validate: {
      len: [0, 50]
    }
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'last_name',
    validate: {
      len: [0, 50]
    }
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: [0, 500]
    }
  },
  profileImage: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'profile_image'
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
  underscored: true,
  validate: {
    mustHaveAuthMethod() {
      if (!this.passwordHash && !this.spotifyId && !this.auth0Id) {
        throw new Error('User must have at least one authentication method');
      }
    }
  }
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
  return (
    this.spotifyAccessToken &&
    this.spotifyTokenExpiresAt &&
    new Date() < this.spotifyTokenExpiresAt
  );
};

module.exports = User;