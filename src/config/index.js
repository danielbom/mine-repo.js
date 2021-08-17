const path = require("path");

require("dotenv").config({
  path: path.join(__dirname, "..", "..", ".env"),
});

function throwKeyError(message = "") {
  console.error();
  console.error("Rules of the field GITHUB_APIKEYS of .env:");
  console.error("* Must be a single string with one or more keys.");
  console.error("* Must be separated with commas.");
  console.error("* Must have at least 1 key.");
  console.error();
  console.error("Example #1: One key");
  console.error("GITHUB_APIKEYS=ghp_xxxxxxx1");
  console.error();
  console.error("Example #2: Multiple keys");
  console.error("GITHUB_APIKEYS=ghp_xxxxxxx1,ghp_xxxxxxx2,ghp_xxxxxxx3");
  console.error();

  if (message) message = "\n" + message;
  throw new Error("Invalid GITHUB_APIKEYS .env field" + message + "\n");
}

const keysStr = process.env.GITHUB_APIKEYS || "";
const keys =
  keysStr.startsWith("[") || keysStr.endsWith("]") ? [] : keysStr.split(",");

if (keys.length === 0) {
  throwKeyError();
}

const invalidKeys = keys.filter(
  (key) => !key.startsWith("ghp_") || key.length < 10 || key.includes(" ")
);

if (invalidKeys.length > 0) {
  throwKeyError(
    `Invalid keys found: ${invalidKeys.map((x) => '"' + x + '"').join(", ")}`
  );
}

module.exports = {
  GITHUB_APIKEYS: keys,
  MONGODB_URI: process.env.MONGODB_URI,
};
