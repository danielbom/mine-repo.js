const NS_PER_SEC = 1e9;
const MS_PER_NS = 1e-6;
function hrtimeMs(diffTimer) {
  return (diffTimer[0] * NS_PER_SEC + diffTimer[1]) * MS_PER_NS;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(ms), ms);
  });
}

module.exports = {
  hrtimeMs,
  sleep,
};
