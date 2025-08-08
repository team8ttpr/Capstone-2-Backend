require("dotenv").config();
const { Sequelize } = require("sequelize");
const pg = require("pg");

const dbName = "capstone-2";

const db = new Sequelize(
  process.env.DATABASE_URL || `postgres://localhost:5432/${dbName}`,
  {
    logging: false,
  }
);

module.exports = db;
