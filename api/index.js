const express = require("express");
const router = express.Router();
const testDbRouter = require("./test-db");
const postsRouter = require("./posts");

router.use("/test-db", testDbRouter);
router.use("/posts", postsRouter);

module.exports = router;
