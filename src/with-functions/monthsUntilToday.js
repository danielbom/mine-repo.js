const { differenceInMonths } = require("date-fns");
const TODAY = new Date();

function monthsUntilToday(date) {
  return differenceInMonths(TODAY, date);
}

module.exports = monthsUntilToday;
