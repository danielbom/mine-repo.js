const NS_PER_SEC = 1e9;
const MS_PER_NS = 1e-6;
function hrtimeMs(diffTimer) {
  return (diffTimer[0] * NS_PER_SEC + diffTimer[1]) * MS_PER_NS;
}

module.exports = hrtimeMs;
