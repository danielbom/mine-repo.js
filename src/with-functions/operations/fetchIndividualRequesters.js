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
}) {
  const pullRequests = await getPullRequests();
  const count = pullRequests.length;

  logger.info(prefix + " Requesters count: " + count);
  for (let i = 0; i < count; i++) {
    const pr = pullRequests[i];
    const data = mapPullRequestToData(pr);
    const percentage = ((i / count) * 100).toFixed(0);

    const label = `${prefix} Fetching individual requester [${i}|${count}] ${percentage}%`;
    await timeIt(label, async () => {
      const mustFetch = await checkMustFetch(data);

      if (mustFetch) {
        const response = await fetchPullRequestRequester(data);
        await storeProjectRequesterData(data, response.data);
      }

      await onFetchProjectComplete(pr);
    });
  }
}

module.exports = fetchIndividualRequesters;
