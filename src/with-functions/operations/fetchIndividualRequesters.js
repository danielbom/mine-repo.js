const Promise = require("bluebird");
const computePercentage = require("./computePercentage");

async function fetchIndividualRequesters({
  prefix,
  logger,
  timeIt,
  getPullRequests,
  getRequesterLogin,
  checkMustFetch,
  storeRequesterData,
  fetchRequesterData,
  onFetchRequesterComplete,
  concurrency,
}) {
  const pullRequests = await getPullRequests();
  const count = pullRequests.length;

  // Parallel requirement
  const requestersSet = new Set();

  logger.info(prefix + " Requesters count: " + count);
  async function mapper(pr, i) {
    i = count - i;
    const requesterLogin = getRequesterLogin(pr);
    const percentage = computePercentage(i, count);

    const label = `${prefix} Fetching individual requester [${i}|${count}] ${percentage}%`;

    if (requestersSet.has(requesterLogin)) return;
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
  await Promise.map(pullRequests, mapper, { concurrency });
}

module.exports = fetchIndividualRequesters;
