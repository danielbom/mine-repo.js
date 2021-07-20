const Promise = require("bluebird");
const computePercentage = require("./computePercentage");

async function fetchIndividualRequesters({
  prefix,
  logger,
  timeIt,
  getPullRequests,
  mapPullRequestToData,
  checkMustFetch,
  onFetchProjectComplete,
  storeProjectRequesterData,
  fetchPullRequestRequester,
  concurrency,
}) {
  const pullRequests = await getPullRequests();
  const count = pullRequests.length;

  const dataSet = new Set();

  logger.info(prefix + " Requesters count: " + count);
  async function mapper(pr, i) {
    i = count - i;
    const percentage = computePercentage(i, count);

    const label = `${prefix} Fetching individual requester [${i}|${count}] ${percentage}%`;

    if (dataSet.has(data)) return;
    dataSet.add(data);

    await timeIt(label, async () => {
      const mustFetch = await checkMustFetch(data);

      if (mustFetch) {
        const response = await fetchPullRequestRequester(data);
        await storeProjectRequesterData(data, response.data);
      }

      await onFetchProjectComplete(pr);
    });
  }
  await Promise.map(pullRequests, mapper, { concurrency });
}

module.exports = fetchIndividualRequesters;
