const parseMillisecondsIntoReadableTime = require("./with-functions/parseMillisecondsIntoReadableTime");

function diffTime(date1, date2) {
  const ms = Math.abs(new Date(date1).getTime() - new Date(date2).getTime());
  return parseMillisecondsIntoReadableTime(ms);
}

module.exports = diffTime;
