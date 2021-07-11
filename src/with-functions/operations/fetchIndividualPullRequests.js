async function fetchIndividualPullRequests({
  getPullRequests,
  fetchIndividualPullRequest,
  storeIndividualPullRequest,
}) {
  const pullRequests = await getPullRequests();

  for (const pr of pullRequests) {
    const response = await fetchIndividualPullRequest(pr);
    await storeIndividualPullRequest(pr, response.data);
  }
}

module.exports = fetchIndividualPullRequests;
