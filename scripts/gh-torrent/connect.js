const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });
const mysql = require("mysql2");

function ghTorrentDatabase() {
  return mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: "ghtorrent_db",
  });
}

module.exports = ghTorrentDatabase;
