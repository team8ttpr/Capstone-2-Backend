const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.send("Hi this is Feed page");
});

router.get("/feed", (req, res) => {
  res.send("Hi this is Feed page");
});

router.get("/notifications", (req, res) => {
  res.send("Hi this is notifications page");
});

router.get("/messages", (req, res) => {
  res.send("Hi this is messages page");
});

router.get("/friends", (req, res) => {
  res.send("Hi this is My Friends page");
});

router.get("/my-posts", (req, res) => {
  res.send("Hi this is Profile page");
});

module.exports = router;
