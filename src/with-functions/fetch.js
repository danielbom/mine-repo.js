const api = require("../apis/github");
const logger = require("./logger");
const sleep = require("./sleep");
const catchSafeErrors = require("./catchSafeErrors");
const counterFetch = require("./counterFetch");
const config = require("../config");

const keys = config.GITHUB_APIKEYS;
const keysCount = config.GITHUB_APIKEYS.length;

function setApiKeyHeader(api, index) {
  const githubApi = keys[index % keysCount];
  api.defaults.headers.Authorization = `Bearer ${githubApi}`;
}

// Configure a rotate api key
async function fetch(url) {
  const count = counterFetch.get();
  setApiKeyHeader(api, count);

  const countStr = count.toString().padStart(6, " ");
  logger.info(`[${countStr}]: ${url}`);

  const httpPromise = api.get(url).catch(catchSafeErrors);
  const [data] = await Promise.all([httpPromise, sleep(500)]);
  return data;
}

module.exports = fetch;
