const db = require("../src/database");

db.connect()
  .then(() => db.clear())
  .then(() => db.disconnect());
