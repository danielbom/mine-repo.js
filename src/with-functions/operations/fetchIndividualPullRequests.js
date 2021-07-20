const Promise = require("bluebird");
const computePercentage = require("./computePercentage");

async function fetchIndividualPullRequests({
  prefix,
  timeIt,
  logger,
  getPullRequests,
  fetchIndividualPullRequest,
  storeIndividualPullRequest,
  concurrency,
}) {
  const pullRequests = await getPullRequests();
  const count = pullRequests.length;

  logger.info(prefix + " Pull requests count: " + count);
  async function mapper(pr, i) {
    i = count - i;
    const percentage = computePercentage(i, count);

    const label = `${prefix} Fetching individual pull request [${i}|${count}] ${percentage}%`;
    await timeIt(label, async () => {
      const response = await fetchIndividualPullRequest(pr);
      await storeIndividualPullRequest(pr, response.data);
    });
  }
  await Promise.map(pullRequests, mapper, { concurrency });
}

module.exports = fetchIndividualPullRequests;
