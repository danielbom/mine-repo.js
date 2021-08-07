const Promise = require("bluebird");

async function computePaginatedPullRequests({
  getPullRequests,
  mapper,
  concurrency,
}) {
  let page = 0;
  while (true) {
    const pullRequests = await getPullRequests({ page });
    if (pullRequests.length === 0) break;

    await Promise.map(pullRequests, mapper, { concurrency });
    page++;
  }
}

module.exports = computePaginatedPullRequests;
