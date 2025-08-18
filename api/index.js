const express = require("express");
const router = express.Router();

const testDbRouter = require("./test-db");
const searchRouter = require("./search");
const postsRouter = require("./posts");
const profileRouter = require("./profile");
const stickersRouter = require("./stickers");
const followRouter = require("./follow");
const commentsRouter = require("./comments");
const notificationsRouter = require("./notifications");

router.use("/test-db", testDbRouter);
router.use("/search-songs", searchRouter);
router.use("/posts", postsRouter);
router.use("/profile", profileRouter);
router.use("/follow", followRouter);
router.use("/stickers", stickersRouter);
router.use("/", commentsRouter);
router.use("/notifications", notificationsRouter);

module.exports = router;
