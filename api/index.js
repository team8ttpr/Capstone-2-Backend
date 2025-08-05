const express = require("express");
const router = express.Router();
const testDbRouter = require("./test-db");
const searchRouter = require("./search");

router.use("/test-db", testDbRouter);
router.use("/search-songs", searchRouter);

module.exports = router;