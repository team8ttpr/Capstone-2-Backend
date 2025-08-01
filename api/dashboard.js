const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.send("Hi this is Dashboard page");
});

router.get("/analytics", (req, res) => {
  res.send("Hi this is Analytics page");
});

router.get("/top-tracks", (req, res) => {
  res.send("Hi this is Top Tracks page");
});

router.get("/top-artist", (req, res) => {
  res.send("Hi this is Top Artist page");
});

router.get("/my-playlist", (req, res) => {
  res.send("Hi this is My Playlist page");
});

router.get("/profile", (req, res) => {
  res.send("Hi this is Profile page");
});

module.exports = router;
