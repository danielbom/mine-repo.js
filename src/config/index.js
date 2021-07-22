const path = require("path");

require("dotenv").config({
  path: path.join(__dirname, "..", "..", ".env"),
});

const keys = (process.env.GITHUB_APIKEYS || "")
  .split(",")
  .filter((key) => key.length > 0)
  .filter((key) => !key.startsWith("[") && !key.endsWith("]"));

if (keys.length === 0) {
  throw new Error("Configuration error. Fill the .env with a github API key.");
}

module.exports = {
  GITHUB_APIKEYS: keys,
  MONGODB_URI: process.env.MONGODB_URI,
};
