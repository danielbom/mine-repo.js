const { differenceInMonths } = require("date-fns");
const TODAY = require("./TODAY");

function monthsUntilToday(createdAt) {
  return differenceInMonths(TODAY, createdAt);
}

module.exports = monthsUntilToday;
