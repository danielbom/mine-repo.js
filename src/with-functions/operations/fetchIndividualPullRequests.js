async function fetchIndividualPullRequests({
  opts,
  getPullRequests,
  fetchIndividualPullRequest,
  storeIndividualPullRequest,
}) {
  const { timeIt } = opts;
  const pullRequests = await getPullRequests();

  for (const pr of pullRequests) {
    await timeIt(`Fetching individual pull request`, async () => {
      const response = await fetchIndividualPullRequest(pr);
      await storeIndividualPullRequest(pr, response.data);
    });
  }
}

module.exports = fetchIndividualPullRequests;
