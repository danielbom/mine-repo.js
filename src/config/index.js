const path = require("path");

require("dotenv").config({
  path: path.join(__dirname, "..", "..", ".env"),
});

const key = process.env.GITHUB_APIKEY;
const keys = (process.env.GITHUB_APIKEYS || "")
  .split(",")
  .filter((key) => key.length > 0);

module.exports = {
  GITHUB_APIKEY: key,
  GITHUB_APIKEYS: keys.length > 0 ? keys : [key],
  MONGODB_URI: process.env.MONGODB_URI,
};
