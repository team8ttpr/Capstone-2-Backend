const express = require("express");
const router = express.Router();
const testDbRouter = require("./test-db");
const searchRouter = require("./search");
const postsRouter = require("./posts");
const profileRouter = require("./profile");

router.use("/test-db", testDbRouter);
router.use("/search-songs", searchRouter);
router.use("/posts", postsRouter);
router.use("/profile", profileRouter);

module.exports = router;
