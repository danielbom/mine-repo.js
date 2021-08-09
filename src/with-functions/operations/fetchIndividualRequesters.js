const computePercentage = require("./computePercentage");
const computePaginated = require("./computePaginated");

async function fetchIndividualRequesters({
  prefix,
  logger,
  timeIt,
  getPullRequestsCount,
  getPullRequests,
  getRequesterLogin,
  checkMustFetch,
  storeRequesterData,
  fetchRequesterData,
  onFetchRequesterComplete,
  concurrency,
}) {
  const count = await getPullRequestsCount();

  // Parallel requirement
  const requestersSet = new Set();

  logger.info(prefix + " Requesters count: " + count);
  let i = 0;
  async function mapper(pr) {
    const currentCount = ++i;
    const requesterLogin = getRequesterLogin(pr);
    const percentage = computePercentage(currentCount, count);

    const label = `${prefix} Fetching individual requester [${currentCount}|${count}] ${percentage}%`;

    if (requestersSet.has(requesterLogin)) {
      return onFetchRequesterComplete(pr);
    }
    requestersSet.add(requesterLogin);

    await timeIt(label, async () => {
      const mustFetch = await checkMustFetch(requesterLogin);

      if (mustFetch) {
        const response = await fetchRequesterData(requesterLogin);
        await storeRequesterData(requesterLogin, response.data);
      }

      await onFetchRequesterComplete(pr);
    });
  }
  await computePaginated({
    mapper,
    concurrency,
    getPaginated: getPullRequests,
  });
}

module.exports = fetchIndividualRequesters;
