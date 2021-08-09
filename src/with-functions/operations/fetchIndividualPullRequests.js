const computePercentage = require("./computePercentage");
const computePaginated = require("./computePaginated");

async function fetchIndividualPullRequests({
  prefix,
  timeIt,
  logger,
  getPullRequestsCount,
  getPullRequests,
  fetchIndividualPullRequest,
  storeIndividualPullRequest,
  concurrency,
}) {
  const count = await getPullRequestsCount();

  logger.info(prefix + " Pull requests count: " + count);
  let i = 0;
  async function mapper(pr) {
    const currentCount = ++i;
    const percentage = computePercentage(currentCount, count);

    const label = `${prefix} Fetching individual pull request [${currentCount}|${count}] ${percentage}%`;
    await timeIt(label, async () => {
      const response = await fetchIndividualPullRequest(pr);
      await storeIndividualPullRequest(pr, response.data);
    });
  }
  await computePaginated({
    mapper,
    concurrency,
    getPaginated: getPullRequests,
  });
}

module.exports = fetchIndividualPullRequests;
