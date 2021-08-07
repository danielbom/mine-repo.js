const Promise = require("bluebird");

async function computePaginated({ getPaginated, mapper, concurrency }) {
  let page = 0;
  while (true) {
    const pullRequests = await getPaginated({ page });
    if (pullRequests.length === 0) break;

    await Promise.map(pullRequests, mapper, { concurrency });
    page++;
  }
}

module.exports = computePaginated;
