async function fetchIndividualPullRequests({
  getPullRequests,
  fetchIndividualPullRequest,
  storeIndividualPullRequest,
}) {
  const pullRequests = getPullRequests();

  for await (const pr of pullRequests) {
    const response = await fetchIndividualPullRequest(pr);
    await storeIndividualPullRequest(pr, response.data);
  }
}

module.exports = fetchIndividualPullRequests;
