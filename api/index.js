const express = require("express");
const router = express.Router();
const testDbRouter = require("./test-db");
const searchRouter = require("./search");
const postsRouter = require("./posts");
const userRouter = require("./user");

router.use("/test-db", testDbRouter);
router.use("/search-songs", searchRouter);
router.use("/posts", postsRouter);
router.use("/user", userRouter);

module.exports = router;