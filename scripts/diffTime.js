const parseMillisecondsIntoReadableTime = require("../src/with-functions/parseMillisecondsIntoReadableTime");

function diffTime(date1, date2) {
  const ms = Math.abs(new Date(date1).getTime() - new Date(date2).getTime());
  return parseMillisecondsIntoReadableTime(ms);
}

const args = process.argv.slice(2);

console.log(diffTime(args[0], args[1]));
