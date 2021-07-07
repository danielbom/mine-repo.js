const path = require("path");

require("dotenv").config({
  path: path.join(__dirname, "..", "..", ".env"),
});

module.exports = {
  GITHUB_APIKEY: process.env.GITHUB_APIKEY,
  MONGODB_URI: process.env.MONGODB_URI,
};
