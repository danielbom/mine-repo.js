const path = require("path");

require("dotenv").config({
  path: path.join(__dirname, "..", "..", ".env"),
});

module.exports = {
  GITHUB_APIKEY: process.env.GITHUB_APIKEY,
  GITHUB_APIKEYS: process.env.GITHUB_APIKEYS.split(","),
  MONGODB_URI: process.env.MONGODB_URI,
};
