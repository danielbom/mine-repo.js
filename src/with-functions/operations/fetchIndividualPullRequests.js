async function fetchIndividualPullRequests({
  opts,
  getPullRequests,
  fetchIndividualPullRequest,
  storeIndividualPullRequest,
}) {
  const { timeIt } = opts;
  const pullRequests = await getPullRequests();
  const count = pullRequests.length;

  opts.logger.info("Pull requests count: " + count);
  for (let i = 0; i < count; i++) {
    const pr = pullRequests[i];
    const label = `Fetching individual pull request [${i}|${count}]`;
    await timeIt(label, async () => {
      const response = await fetchIndividualPullRequest(pr);
      await storeIndividualPullRequest(pr, response.data);
    });
  }
}

module.exports = fetchIndividualPullRequests;
