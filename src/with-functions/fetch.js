const api = require("../apis/github");
const logger = require("./logger");
const catchSafeErrors = require("./catchSafeErrors");
const counterFetch = require("./counterFetch");
const config = require("../config");

const keys = config.GITHUB_APIKEYS;
const keysCount = config.GITHUB_APIKEYS.length;

let maybePromise = null;
let currentKey = 0;

// Configure a rotate api key
async function fetch(url, tryNextKey = keysCount, rotating = false) {
  function rotateKeys(err) {
    if (tryNextKey > 0) {
      if (err.isAxiosError && err.response) {
        if (err.response.status === 403) {
          if (maybePromise === null || rotating) {
            currentKey = (currentKey + 1) % keysCount;
            maybePromise = fetch(url, tryNextKey - 1, true).finally(() => {
              maybePromise = null;
            });
            return maybePromise;
          } else {
            return maybePromise.then(() => fetch(url, 0, false));
          }
        }
      }
    }

    throw err;
  }

  api.defaults.headers.Authorization = `Bearer ${keys[currentKey]}`;

  const count = counterFetch.get();
  if (!rotating) {
    const countStr = count.toString().padStart(6, " ");
    logger.info(`[${countStr}]: ${url}`);
  }

  return await api.get(url).catch(rotateKeys).catch(catchSafeErrors);
}

module.exports = fetch;
