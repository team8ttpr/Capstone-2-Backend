const express = require("express");
const router = express.Router();
const testDbRouter = require("./test-db");
const dashboardRoutes = require("./dashboard");
const socialRoutes = require("./social");

router.use("/test-db", testDbRouter);
router.use("/social", socialRoutes);
router.use("/dashboard", dashboardRoutes);

module.exports = router;
