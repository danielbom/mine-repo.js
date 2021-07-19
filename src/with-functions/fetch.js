const api = require("../apis/github");
const logger = require("./logger");
const sleep = require("./sleep");
const catchSafeErrors = require("./catchSafeErrors");
const counterFetch = require("./counterFetch");

async function fetch(url) {
  const count = counterFetch.get().toString().padStart(6, " ");
  logger.info(`[${count}]: ${url}`);

  const httpPromise = api.get(url).catch(catchSafeErrors);
  const [data] = await Promise.all([httpPromise, sleep(500)]);
  return data;
}

module.exports = fetch;
