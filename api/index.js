const express = require("express");
const router = express.Router();
const testDbRouter = require("./test-db");
const app = require ("../app");

router.use("/test-db", testDbRouter);

module.exports = app;
